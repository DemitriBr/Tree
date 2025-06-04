// Kanban Board View - Drag and drop status management
import { appState } from '../core/state.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { getAllApplicationsFromDB, updateApplicationInDB } from '../core/db.js';
import { formatDate, truncateText, performanceMonitor } from '../core/utils.js';
import { notifySuccess, notifyError } from '../ui/ui.js';
import { STATUS_TYPES } from '../core/config.js';

// Kanban column configuration
const KANBAN_COLUMNS = [
    { id: 'applied', title: 'Applied', color: '#667eea' },
    { id: 'screening', title: 'Screening', color: '#764ba2' },
    { id: 'interview', title: 'Interview', color: '#f093fb' },
    { id: 'offer', title: 'Offer', color: '#66bb6a' },
    { id: 'rejected', title: 'Rejected', color: '#ef5350' },
    { id: 'withdrawn', title: 'Withdrawn', color: '#78909c' }
];

/**
 * Render the Kanban board
 */
export async function renderKanbanBoard() {
    performanceMonitor.start('render-kanban');
    
    try {
        const applications = await getAllApplicationsFromDB();
        const container = document.getElementById('kanbanContainer');
        
        if (!container) {
            console.error('Kanban container not found');
            return;
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create kanban board structure
        const board = createKanbanBoard(applications);
        container.appendChild(board);
        
        // Initialize drag and drop
        initializeDragAndDrop();
        
        // Set up auto-refresh
        setupAutoRefresh();
        
        performanceMonitor.end('render-kanban');
        
    } catch (error) {
        console.error('Error rendering kanban board:', error);
        notifyError('Failed to load kanban board');
        performanceMonitor.end('render-kanban');
    }
}

/**
 * Create the kanban board structure
 */
function createKanbanBoard(applications) {
    const board = document.createElement('div');
    board.className = 'kanban-board';
    board.setAttribute('role', 'region');
    board.setAttribute('aria-label', 'Kanban board');
    
    // Group applications by status
    const groupedApplications = groupApplicationsByStatus(applications);
    
    // Create columns
    KANBAN_COLUMNS.forEach(column => {
        const columnElement = createKanbanColumn(column, groupedApplications[column.id] || []);
        board.appendChild(columnElement);
    });
    
    return board;
}

/**
 * Group applications by status
 */
function groupApplicationsByStatus(applications) {
    return applications.reduce((groups, app) => {
        if (!groups[app.status]) {
            groups[app.status] = [];
        }
        groups[app.status].push(app);
        return groups;
    }, {});
}

/**
 * Create a kanban column
 */
function createKanbanColumn(columnConfig, applications) {
    const column = document.createElement('div');
    column.className = 'kanban-column';
    column.setAttribute('data-status', columnConfig.id);
    column.style.setProperty('--column-color', columnConfig.color);
    
    // Column header
    const header = document.createElement('div');
    header.className = 'kanban-column-header';
    
    const title = document.createElement('h3');
    title.textContent = columnConfig.title;
    
    const count = document.createElement('span');
    count.className = 'kanban-count';
    count.textContent = applications.length;
    
    header.appendChild(title);
    header.appendChild(count);
    
    // Column body (drop zone)
    const body = document.createElement('div');
    body.className = 'kanban-column-body';
    body.setAttribute('data-status', columnConfig.id);
    body.setAttribute('role', 'list');
    body.setAttribute('aria-label', `${columnConfig.title} applications`);
    
    // Sort applications by date (newest first)
    applications.sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate));
    
    // Add cards
    applications.forEach(app => {
        const card = createKanbanCard(app);
        body.appendChild(card);
    });
    
    // Empty state
    if (applications.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'kanban-empty-state';
        emptyState.textContent = 'No applications';
        body.appendChild(emptyState);
    }
    
    column.appendChild(header);
    column.appendChild(body);
    
    return column;
}

/**
 * Create a kanban card
 */
function createKanbanCard(application) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.setAttribute('data-id', application.id);
    card.setAttribute('draggable', 'true');
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${application.jobTitle} at ${application.companyName}`);
    
    // Card content
    const title = document.createElement('div');
    title.className = 'kanban-card-title';
    title.textContent = application.jobTitle;
    
    const company = document.createElement('div');
    company.className = 'kanban-card-company';
    company.textContent = application.companyName;
    
    const date = document.createElement('div');
    date.className = 'kanban-card-date';
    date.textContent = formatDate(application.applicationDate);
    
    // Optional fields
    if (application.location) {
        const location = document.createElement('div');
        location.className = 'kanban-card-location';
        location.innerHTML = `📍 ${application.location}`;
        card.appendChild(location);
    }
    
    if (application.notes) {
        const notes = document.createElement('div');
        notes.className = 'kanban-card-notes';
        notes.textContent = truncateText(application.notes, 80);
        card.appendChild(notes);
    }
    
    // Assemble card
    card.appendChild(title);
    card.appendChild(company);
    card.appendChild(date);
    
    // Card actions (view/edit)
    const actions = document.createElement('div');
    actions.className = 'kanban-card-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-icon';
    viewBtn.innerHTML = '👁️';
    viewBtn.title = 'View details';
    viewBtn.setAttribute('aria-label', 'View application details');
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewApplicationDetails(application.id);
    });
    
    actions.appendChild(viewBtn);
    card.appendChild(actions);
    
    return card;
}

/**
 * Initialize drag and drop functionality
 */
function initializeDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column-body');
    
    // Card drag events
    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        
        // Keyboard support
        card.addEventListener('keydown', handleCardKeyboard);
    });
    
    // Column drop events
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
    const card = e.target;
    const applicationId = card.getAttribute('data-id');
    const currentColumn = card.closest('.kanban-column-body');
    const currentStatus = currentColumn.getAttribute('data-status');
    
    // Store drag data
    appState.kanban.draggedCard = card;
    appState.kanban.draggedApplicationId = applicationId;
    appState.kanban.originalStatus = currentStatus;
    
    // Visual feedback
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', card.innerHTML);
    
    // Emit event
    eventBus.emit(EVENTS.CARD_DRAG_START, { applicationId, status: currentStatus });
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
    const card = e.target;
    card.classList.remove('dragging');
    
    // Clear all drop zones
    document.querySelectorAll('.kanban-column-body').forEach(column => {
        column.classList.remove('drag-over');
    });
    
    // Clear drag state
    appState.kanban.draggedCard = null;
    appState.kanban.draggedApplicationId = null;
    appState.kanban.originalStatus = null;
    
    // Emit event
    eventBus.emit(EVENTS.CARD_DRAG_END);
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handle drag enter
 */
function handleDragEnter(e) {
    const column = e.currentTarget;
    column.classList.add('drag-over');
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
    const column = e.currentTarget;
    if (e.target === column) {
        column.classList.remove('drag-over');
    }
}

/**
 * Handle drop
 */
async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();
    
    const dropZone = e.currentTarget;
    const newStatus = dropZone.getAttribute('data-status');
    const { draggedCard, draggedApplicationId, originalStatus } = appState.kanban;
    
    // Remove visual feedback
    dropZone.classList.remove('drag-over');
    
    if (draggedCard && draggedApplicationId && newStatus !== originalStatus) {
        try {
            // Update application status in database
            await updateApplicationInDB(draggedApplicationId, { status: newStatus });
            
            // Move card to new column
            dropZone.appendChild(draggedCard);
            
            // Update column counts
            updateColumnCounts();
            
            // Remove empty state if present
            const emptyState = dropZone.querySelector('.kanban-empty-state');
            if (emptyState) {
                emptyState.remove();
            }
            
            // Add empty state to original column if needed
            const originalColumn = document.querySelector(`.kanban-column-body[data-status="${originalStatus}"]`);
            if (originalColumn && originalColumn.children.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'kanban-empty-state';
                emptyState.textContent = 'No applications';
                originalColumn.appendChild(emptyState);
            }
            
            // Notify success
            notifySuccess(`Application moved to ${newStatus}`);
            
            // Emit event
            eventBus.emit(EVENTS.CARD_MOVED, {
                applicationId: draggedApplicationId,
                fromStatus: originalStatus,
                toStatus: newStatus
            });
            
        } catch (error) {
            console.error('Error updating application status:', error);
            notifyError('Failed to update application status');
            
            // Revert the move
            const originalColumn = document.querySelector(`.kanban-column-body[data-status="${originalStatus}"]`);
            if (originalColumn) {
                originalColumn.appendChild(draggedCard);
            }
        }
    }
    
    return false;
}

/**
 * Handle keyboard navigation for cards
 */
function handleCardKeyboard(e) {
    const card = e.target;
    const currentColumn = card.closest('.kanban-column-body');
    const allColumns = Array.from(document.querySelectorAll('.kanban-column-body'));
    const currentIndex = allColumns.indexOf(currentColumn);
    
    switch (e.key) {
        case 'ArrowLeft':
            if (currentIndex > 0) {
                e.preventDefault();
                moveCardToColumn(card, allColumns[currentIndex - 1]);
            }
            break;
            
        case 'ArrowRight':
            if (currentIndex < allColumns.length - 1) {
                e.preventDefault();
                moveCardToColumn(card, allColumns[currentIndex + 1]);
            }
            break;
            
        case 'Enter':
        case ' ':
            e.preventDefault();
            viewApplicationDetails(card.getAttribute('data-id'));
            break;
    }
}

/**
 * Move card to a different column (keyboard navigation)
 */
async function moveCardToColumn(card, targetColumn) {
    const applicationId = card.getAttribute('data-id');
    const newStatus = targetColumn.getAttribute('data-status');
    const currentColumn = card.closest('.kanban-column-body');
    const currentStatus = currentColumn.getAttribute('data-status');
    
    if (newStatus === currentStatus) return;
    
    try {
        // Update in database
        await updateApplicationInDB(applicationId, { status: newStatus });
        
        // Move card
        targetColumn.appendChild(card);
        card.focus();
        
        // Update counts and empty states
        updateColumnCounts();
        
        // Handle empty states
        if (currentColumn.children.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'kanban-empty-state';
            emptyState.textContent = 'No applications';
            currentColumn.appendChild(emptyState);
        }
        
        const targetEmptyState = targetColumn.querySelector('.kanban-empty-state');
        if (targetEmptyState) {
            targetEmptyState.remove();
        }
        
        // Notify
        notifySuccess(`Application moved to ${newStatus}`);
        
        // Emit event
        eventBus.emit(EVENTS.CARD_MOVED, {
            applicationId,
            fromStatus: currentStatus,
            toStatus: newStatus
        });
        
    } catch (error) {
        console.error('Error moving card:', error);
        notifyError('Failed to move application');
    }
}

/**
 * Update column counts
 */
function updateColumnCounts() {
    document.querySelectorAll('.kanban-column').forEach(column => {
        const body = column.querySelector('.kanban-column-body');
        const count = column.querySelector('.kanban-count');
        const cards = body.querySelectorAll('.kanban-card');
        count.textContent = cards.length;
    });
}

/**
 * View application details
 */
async function viewApplicationDetails(applicationId) {
    try {
        const { getApplicationFromDB } = await import('../core/db.js');
        const application = await getApplicationFromDB(applicationId);
        
        if (!application) {
            notifyError('Application not found');
            return;
        }
        
        // Create detail modal
        const modalContent = `
            <div class="modal-content application-detail-modal">
                <div class="modal-header">
                    <h3>${application.jobTitle}</h3>
                    <button class="modal-close" onclick="window.hideModal()" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-section">
                        <strong>Company:</strong> ${application.companyName}
                    </div>
                    <div class="detail-section">
                        <strong>Status:</strong> <span class="status-badge status-${application.status}">${application.status}</span>
                    </div>
                    <div class="detail-section">
                        <strong>Applied:</strong> ${formatDate(application.applicationDate)}
                    </div>
                    ${application.location ? `
                        <div class="detail-section">
                            <strong>Location:</strong> ${application.location}
                        </div>
                    ` : ''}
                    ${application.salary ? `
                        <div class="detail-section">
                            <strong>Salary:</strong> ${application.salary}
                        </div>
                    ` : ''}
                    ${application.deadline ? `
                        <div class="detail-section">
                            <strong>Deadline:</strong> ${formatDate(application.deadline)}
                        </div>
                    ` : ''}
                    ${application.url ? `
                        <div class="detail-section">
                            <strong>Job Posting:</strong> <a href="${application.url}" target="_blank" rel="noopener">View posting</a>
                        </div>
                    ` : ''}
                    ${application.notes ? `
                        <div class="detail-section">
                            <strong>Notes:</strong>
                            <p>${application.notes}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.hideModal()">Close</button>
                    <button class="btn btn-primary" onclick="window.editApplicationFromKanban('${applicationId}')">Edit</button>
                </div>
            </div>
        `;
        
        const { showModal } = await import('../ui/ui.js');
        showModal(modalContent, { ariaLabel: 'Application details' });
        
    } catch (error) {
        console.error('Error viewing application details:', error);
        notifyError('Failed to load application details');
    }
}

/**
 * Setup auto-refresh for kanban board
 */
function setupAutoRefresh() {
    // Clear existing interval
    if (appState.kanban.refreshInterval) {
        clearInterval(appState.kanban.refreshInterval);
    }
    
    // Set up new interval (refresh every 30 seconds if page is visible)
    appState.kanban.refreshInterval = setInterval(() => {
        if (!document.hidden && appState.ui.currentView === 'kanban') {
            renderKanbanBoard();
        }
    }, 30000);
}

/**
 * Clean up when leaving kanban view
 */
export function cleanupKanbanView() {
    if (appState.kanban.refreshInterval) {
        clearInterval(appState.kanban.refreshInterval);
        appState.kanban.refreshInterval = null;
    }
}

// Global function for editing from kanban (temporary)
if (typeof window !== 'undefined') {
    window.editApplicationFromKanban = async (applicationId) => {
        const { hideModal } = await import('../ui/ui.js');
        const { populateFormForEdit } = await import('../ui/formHandler.js');
        const { switchView } = await import('../ui/navigation.js');
        const { getApplicationFromDB } = await import('../core/db.js');
        
        try {
            const application = await getApplicationFromDB(applicationId);
            if (application) {
                hideModal();
                populateFormForEdit(application);
                switchView('home');
            }
        } catch (error) {
            console.error('Error editing application:', error);
            notifyError('Failed to load application for editing');
        }
    };
}

// Listen for view changes to clean up
eventBus.on(EVENTS.VIEW_CHANGED, (data) => {
    if (data.previousView === 'kanban') {
        cleanupKanbanView();
    }
});
