// List View - Application list rendering with performance optimizations
import { appState } from '../core/state.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { getAllApplicationsFromDB, deleteApplicationFromDB } from '../core/db.js';
import { debounce, formatDate, truncateText, performanceMonitor } from '../core/utils.js';
import { populateFormForEdit } from '../ui/formHandler.js';
import { showConfirmModal, notifySuccess, notifyError } from '../ui/ui.js';
import { switchView } from '../ui/navigation.js';

// Virtual scrolling implementation for large datasets
class VirtualScroller {
    constructor(container, itemHeight = 120, buffer = 5) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.buffer = buffer;
        this.items = [];
        this.startIndex = 0;
        this.endIndex = 0;
        this.visibleItems = 0;
        
        this.setupScrolling();
    }
    
    setupScrolling() {
        this.container.addEventListener('scroll', debounce(() => {
            this.updateVisibleItems();
        }, 16)); // 60fps
    }
    
    setItems(items) {
        this.items = items;
        this.updateVisibleItems();
    }
    
    updateVisibleItems() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;
        
        this.startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
        this.endIndex = Math.min(
            this.items.length,
            Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.buffer
        );
        
        this.renderVisibleItems();
    }
    
    renderVisibleItems() {
        const visibleItems = this.items.slice(this.startIndex, this.endIndex);
        
        // Update container height for scrollbar
        this.container.style.height = `${this.items.length * this.itemHeight}px`;
        
        // Clear and render visible items
        const itemsContainer = this.container.querySelector('.virtual-items');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            itemsContainer.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;
            
            visibleItems.forEach(item => {
                const element = this.createItemElement(item);
                itemsContainer.appendChild(element);
            });
        }
    }
    
    createItemElement(application) {
        return createApplicationCard(application);
    }
}

// Memoized filter function for performance
let lastFilterKey = '';
let lastFilterResult = [];

const memoizedApplyFilters = (applications, filters) => {
    const filterKey = JSON.stringify(filters);
    
    if (filterKey === lastFilterKey) {
        return lastFilterResult;
    }
    
    performanceMonitor.start('filter-applications');
    
    let filtered = applications;
    
    // Text search
    if (filters.query) {
        const query = filters.query.toLowerCase();
        filtered = filtered.filter(app => 
            app.jobTitle.toLowerCase().includes(query) ||
            app.companyName.toLowerCase().includes(query) ||
            app.location?.toLowerCase().includes(query) ||
            app.notes?.toLowerCase().includes(query)
        );
    }
    
    // Status filter
    if (filters.statusFilter) {
        filtered = filtered.filter(app => app.status === filters.statusFilter);
    }
    
    // Date range filter
    if (filters.dateRangeFilter) {
        const now = new Date();
        let startDate;
        
        switch (filters.dateRangeFilter) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }
        
        if (startDate) {
            filtered = filtered.filter(app => new Date(app.applicationDate) >= startDate);
        }
    }
    
    lastFilterKey = filterKey;
    lastFilterResult = filtered;
    
    performanceMonitor.end('filter-applications');
    
    return filtered;
};

// Optimized sorting function
const applySorting = (applications, sortBy, sortDirection) => {
    performanceMonitor.start('sort-applications');
    
    const sorted = [...applications].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'date':
                aValue = new Date(a.applicationDate);
                bValue = new Date(b.applicationDate);
                break;
            case 'company':
                aValue = a.companyName.toLowerCase();
                bValue = b.companyName.toLowerCase();
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            default:
                aValue = a.applicationDate;
                bValue = b.applicationDate;
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    performanceMonitor.end('sort-applications');
    
    return sorted;
};

// Optimized card creation using DocumentFragment
export function createApplicationCard(application) {
    performanceMonitor.start('create-card');
    
    const card = document.createElement('div');
    card.className = 'application-card';
    card.setAttribute('data-id', application.id);
    card.setAttribute('data-status', application.status);
    card.setAttribute('role', 'article');
    card.setAttribute('tabindex', '0');
    
    // Create header
    const header = document.createElement('div');
    header.className = 'card-header';
    
    const title = document.createElement('h3');
    title.className = 'job-title';
    title.textContent = application.jobTitle;
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge status-${application.status}`;
    statusBadge.textContent = application.status;
    
    header.appendChild(title);
    header.appendChild(statusBadge);
    
    // Create body
    const body = document.createElement('div');
    body.className = 'card-body';
    
    const companyInfo = document.createElement('div');
    companyInfo.className = 'company-info';
    
    const companyName = document.createElement('strong');
    companyName.textContent = application.companyName;
    companyInfo.appendChild(companyName);
    
    if (application.location) {
        const location = document.createElement('span');
        location.className = 'location';
        location.textContent = `📍 ${application.location}`;
        companyInfo.appendChild(location);
    }
    
    body.appendChild(companyInfo);
    
    // Application date
    const dateDiv = document.createElement('div');
    dateDiv.className = 'application-date';
    dateDiv.textContent = formatDate(application.applicationDate);
    body.appendChild(dateDiv);
    
    // Notes preview
    if (application.notes) {
        const notesDiv = document.createElement('div');
        notesDiv.className = 'notes-preview';
        notesDiv.textContent = truncateText(application.notes, 100);
        body.appendChild(notesDiv);
    }
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-secondary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editApplication(application.id);
    });
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-error';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteApplication(application.id);
    });
    
    if (application.url) {
        const linkBtn = document.createElement('a');
        linkBtn.href = application.url;
        linkBtn.target = '_blank';
        linkBtn.className = 'btn btn-sm btn-info';
        linkBtn.textContent = 'View Job';
        actions.appendChild(linkBtn);
    }
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    body.appendChild(actions);
    
    card.appendChild(header);
    card.appendChild(body);
    
    performanceMonitor.end('create-card');
    
    return card;
}

// Optimized list rendering with batch operations
export async function renderApplicationsList() {
    performanceMonitor.start('render-list-view');
    
    try {
        const applications = await getAllApplicationsFromDB();
        const searchState = appState.getState('search');
        
        // Apply filters and sorting
        const filtered = memoizedApplyFilters(applications, {
            query: searchState.query,
            statusFilter: searchState.statusFilter,
            dateRangeFilter: searchState.dateRangeFilter
        });
        
        const sorted = applySorting(filtered, searchState.sortBy, searchState.sortDirection);
        
        // Update result count
        updateResultCount(sorted.length, applications.length);
        
        // Get container
        const container = document.getElementById('listContainer');
        if (!container) {
            console.error('List container not found');
            return;
        }
        
        // Use virtual scrolling for large datasets
        if (sorted.length > 50) {
            renderWithVirtualScrolling(container, sorted);
        } else {
            renderWithBatching(container, sorted);
        }
        
        // Update search state
        appState.setNestedState('search', 'lastResults', sorted);
        
        // Emit event
        eventBus.emit(EVENTS.SEARCH_UPDATED, { results: sorted });
        
    } catch (error) {
        console.error('Error rendering applications list:', error);
        notifyError('Failed to load applications');
    }
    
    performanceMonitor.end('render-list-view');
}

// Render with virtual scrolling for large datasets
function renderWithVirtualScrolling(container, applications) {
    container.innerHTML = `
        <div class="virtual-scroll-container">
            <div class="virtual-items"></div>
        </div>
    `;
    
    const virtualContainer = container.querySelector('.virtual-scroll-container');
    const virtualScroller = new VirtualScroller(virtualContainer);
    virtualScroller.setItems(applications);
}

// Render with batching for smaller datasets
function renderWithBatching(container, applications) {
    // Clear container
    container.innerHTML = '';
    
    if (applications.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <h3>No applications found</h3>
            <p>Try adjusting your search criteria or add a new application.</p>
        `;
        container.appendChild(emptyState);
        return;
    }
    
    // Use DocumentFragment for batch DOM updates
    const fragment = document.createDocumentFragment();
    const batchSize = 10;
    
    // Render in batches to avoid blocking the UI
    const renderBatch = (startIndex) => {
        const endIndex = Math.min(startIndex + batchSize, applications.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const card = createApplicationCard(applications[i]);
            fragment.appendChild(card);
        }
        
        if (endIndex < applications.length) {
            // Schedule next batch
            requestAnimationFrame(() => renderBatch(endIndex));
        } else {
            // Final batch - append to DOM
            container.appendChild(fragment);
            
            // Setup lazy loading for images if any
            setupLazyLoading(container);
        }
    };
    
    // Start rendering
    renderBatch(0);
}

// Lazy loading for images and heavy content
function setupLazyLoading(container) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, { threshold: 0.1 });
    
    container.querySelectorAll('img[data-src]').forEach(img => {
        observer.observe(img);
    });
}

// Update result count display
function updateResultCount(filteredCount, totalCount) {
    const resultElement = document.getElementById('resultCount');
    if (resultElement) {
        if (filteredCount === totalCount) {
            resultElement.textContent = `Showing all ${totalCount} applications`;
        } else {
            resultElement.textContent = `Showing ${filteredCount} of ${totalCount} applications`;
        }
    }
}

// Edit application handler
async function editApplication(applicationId) {
    try {
        const { getApplicationFromDB } = await import('../core/db.js');
        const application = await getApplicationFromDB(applicationId);
        
        if (application) {
            populateFormForEdit(application);
            switchView('home');
        } else {
            notifyError('Application not found');
        }
    } catch (error) {
        console.error('Error loading application for edit:', error);
        notifyError('Failed to load application');
    }
}

// Delete application handler
function deleteApplication(applicationId) {
    showConfirmModal(
        'Delete Application',
        'Are you sure you want to delete this application? This action cannot be undone.',
        async () => {
            try {
                await deleteApplicationFromDB(applicationId);
                notifySuccess('Application deleted successfully');
                renderApplicationsList();
                
                eventBus.emit(EVENTS.APPLICATION_DELETED, { id: applicationId });
            } catch (error) {
                console.error('Error deleting application:', error);
                notifyError('Failed to delete application');
            }
        }
    );
}

// Setup search and filter event listeners
export function setupListViewEvents() {
    // Search input with debouncing
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = debounce((query) => {
            appState.updateSearchQuery(query);
            renderApplicationsList();
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
    
    // Filter dropdowns
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            appState.updateFilters({ statusFilter: e.target.value });
            renderApplicationsList();
        });
    }
    
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    if (dateRangeFilter) {
        dateRangeFilter.addEventListener('change', (e) => {
            appState.updateFilters({ dateRangeFilter: e.target.value });
            renderApplicationsList();
        });
    }
    
    // Sort buttons
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sortBy = button.getAttribute('data-sort');
            const currentDirection = button.getAttribute('data-direction');
            const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            
            // Update UI
            sortButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-sort', 'none');
            });
            
            button.classList.add('active');
            button.setAttribute('data-direction', newDirection);
            button.setAttribute('aria-sort', newDirection === 'asc' ? 'ascending' : 'descending');
            
            // Update sort arrow
            const arrow = button.querySelector('.sort-arrow');
            if (arrow) {
                arrow.textContent = newDirection === 'asc' ? '↑' : '↓';
            }
            
            // Update state and re-render
            appState.updateFilters({ sortBy, sortDirection: newDirection });
            renderApplicationsList();
        });
    });
    
    // Reset filters button
    const resetButton = document.getElementById('resetFilters');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            appState.clearFilters();
            
            // Reset UI
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (dateRangeFilter) dateRangeFilter.value = '';
            
            renderApplicationsList();
        });
    }
}

// Listen for application changes
eventBus.on(EVENTS.APPLICATION_ADDED, renderApplicationsList);
eventBus.on(EVENTS.APPLICATION_UPDATED, renderApplicationsList);
eventBus.on(EVENTS.APPLICATION_DELETED, renderApplicationsList);