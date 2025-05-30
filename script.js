
console.log('Script.js is loading!');

// IndexedDB Configuration
const DB_NAME = 'JobApplicationTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'applications';

let db = null;
// Global modal state management
let activeModal = null;
let modalStack = [];
let isModalTransitioning = false; // Single flag for all transitions



// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database failed to open');
            reject('Database failed to open');
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: false
                });

                objectStore.createIndex('status', 'status', { unique: false });
                objectStore.createIndex('companyName', 'companyName', { unique: false });
                objectStore.createIndex('applicationDate', 'applicationDate', { unique: false });
                objectStore.createIndex('deadline', 'deadline', { unique: false });
                objectStore.createIndex('progressStage', 'progressStage', { unique: false });

                console.log('Object store created with indexes');
            }
        };
    });
}

// Generate unique ID for applications
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Search, Filter, Sort State Management
let searchFilterState = {
    searchTerm: '',
    statusFilter: '',
    dateRangeFilter: '',
    sortBy: 'date',
    sortDirection: 'desc'
};

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// View Management
function setupNavButtons() {
    console.log('Setting up navigation buttons...');
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('Found nav buttons:', navButtons.length);
    
    navButtons.forEach((button, index) => {
        console.log(`Button ${index}:`, button.textContent, 'data-view:', button.dataset.view);
        
        button.addEventListener('click', (e) => {
            console.log('Nav button clicked:', e.target.textContent);
            const targetView = e.target.dataset.view;
            console.log('Target view:', targetView);
            
            if (targetView) {
                switchView(targetView);
                
                // Update active state of navigation buttons
                navButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    });
}

// 3. Update your switchView function to manage auto-refresh:
function switchView(viewName) {
    console.log('Switching to view:', viewName);
    
    // Stop any kanban auto-refresh when switching views
    stopKanbanAutoRefresh();
    
    // Hide all views
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(view => {
        view.classList.remove('active');
    });
    
    // Show the selected view
    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.add('active');
        
        // Perform view-specific actions
        switch(viewName) {
            case 'home':
                const firstInput = document.getElementById('jobTitle');
                if (firstInput) {
                    firstInput.focus();
                }
                break;
                
            case 'list':
                console.log('Loading applications list...');
                renderApplicationsList();
                setupSearchFilterSort();
                break;
                
            case 'dashboard':
                console.log('Loading dashboard statistics...');
                renderDashboard();
                break;
                
            case 'kanban':
                console.log('Loading kanban board...');
                renderKanbanBoard();
                // Optional: Enable auto-refresh for kanban board
                // startKanbanAutoRefresh(30000); // Refresh every 30 seconds
                break;
        }
    }
}

// Form Setup and Handling
function setupApplicationForm() {
    console.log('Setting up application form...');
    const form = document.getElementById('applicationForm');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (form) {
        console.log('Form found, adding submit listener');
        form.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('Form not found!');
    }
    
    if (cancelBtn) {
        console.log('Cancel button found, adding click listener');
        cancelBtn.addEventListener('click', () => {
            console.log('Cancel button clicked');
            resetForm();
            switchView('list');
            
            // Update nav button active states
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.view === 'list') {
                    btn.classList.add('active');
                }
            });
        });
    } else {
        console.error('Cancel button not found!');
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submitted');
    
    const formData = new FormData(e.target);
    const existingId = formData.get('id');
    
    try {
        if (existingId) {
            // Edit mode - get existing application to preserve arrays
            const existingApplication = await getApplicationFromDB(existingId);
            
            const applicationData = {
                ...existingApplication, // Preserve existing data (arrays, etc.)
                id: existingId,
                jobTitle: formData.get('jobTitle'),
                companyName: formData.get('companyName'),
                applicationDate: formData.get('applicationDate'),
                status: formData.get('status'),
                deadline: formData.get('deadline') || null,
                url: formData.get('url') || '',
                salary: formData.get('salary') || '',
                location: formData.get('location') || '',
                progressStage: formData.get('progressStage') || 'to-apply',
                notes: formData.get('notes') || '',
                updatedAt: new Date().toISOString()
            };
            
            await updateApplicationInDB(applicationData);
            console.log('Application updated successfully');

            // Show success notification
            notifySuccess(`Application for ${applicationData.jobTitle} at ${applicationData.companyName} updated successfully!`);
            
        } else {
            // Add mode - create new application
            const applicationData = {
                id: generateId(),
                jobTitle: formData.get('jobTitle'),
                companyName: formData.get('companyName'),
                applicationDate: formData.get('applicationDate'),
                status: formData.get('status'),
                deadline: formData.get('deadline') || null,
                url: formData.get('url') || '',
                salary: formData.get('salary') || '',
                location: formData.get('location') || '',
                progressStage: formData.get('progressStage') || 'to-apply',
                notes: formData.get('notes') || '',
                interviewDates: [],
                contacts: [],
                documents: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await addApplicationToDB(applicationData);
            console.log('Application saved successfully');
             // Show success notification
            notifySuccess(`New application for ${applicationData.jobTitle} at ${applicationData.companyName} added successfully!`);
        }
        
        // Reset form and switch to list view
        resetForm();
        switchView('list');
        
        // Update nav button active states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === 'list') {
                btn.classList.add('active');
            }
        });
        
    } catch (error) {
        console.error('Error saving application:', error);
        notifyError('Failed to save application. Please try again.');
    }
}

// Add application to IndexedDB
function addApplicationToDB(applicationData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.add(applicationData);
        
        request.onsuccess = () => {
            resolve(applicationData);
        };
        
        request.onerror = () => {
            reject('Error adding application to database');
        };
    });
}

// Get a single application from IndexedDB by ID
function getApplicationFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(id);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result);
            } else {
                reject('Application not found');
            }
        };
        
        request.onerror = () => {
            reject('Error fetching application from database');
        };
    });
}

// Update application in IndexedDB
function updateApplicationInDB(applicationData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        
        // Update the timestamp
        applicationData.updatedAt = new Date().toISOString();
        
        const request = objectStore.put(applicationData);
        
        request.onsuccess = () => {
            console.log('Application updated successfully');
            resolve(applicationData);
        };
        
        request.onerror = () => {
            reject('Error updating application in database');
        };
    });
}

// Delete application from IndexedDB
function deleteApplicationFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(id);
        
        request.onsuccess = () => {
            console.log('Application deleted successfully');
            resolve();
        };
        
        request.onerror = () => {
            reject('Error deleting application from database');
        };
    });
}

// Reset form to initial state
function resetForm() {
    console.log('Resetting form');
    const form = document.getElementById('applicationForm');
    const formTitle = document.getElementById('formTitle');
    
    if (form) {
        form.reset();
        // Explicitly clear the hidden ID field
        document.getElementById('applicationId').value = '';
    }
    
    if (formTitle) {
        formTitle.textContent = 'Add New Application';
    }
}

// Fetch all applications from IndexedDB
function getAllApplicationsFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.getAll();
        
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        
        request.onerror = () => {
            reject('Error fetching applications from database');
        };
    });
}

// Apply filters to applications array
function applyFilters(applications) {
    let filtered = [...applications]; // Create a copy to avoid mutating original
    
    // Apply search filter
    if (searchFilterState.searchTerm) {
        filtered = filtered.filter(app => {
            const searchTerm = searchFilterState.searchTerm.toLowerCase();
            return (
                app.jobTitle.toLowerCase().includes(searchTerm) ||
                app.companyName.toLowerCase().includes(searchTerm) ||
                (app.notes && app.notes.toLowerCase().includes(searchTerm)) ||
                (app.location && app.location.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    // Apply status filter
    if (searchFilterState.statusFilter) {
        filtered = filtered.filter(app => app.status === searchFilterState.statusFilter);
    }
    
    // Apply date range filter
    if (searchFilterState.dateRangeFilter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(app => {
            const appDate = new Date(app.applicationDate);
            
            switch (searchFilterState.dateRangeFilter) {
                case 'today':
                    return appDate.toDateString() === today.toDateString();
                    
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return appDate >= weekAgo;
                    
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return appDate >= monthAgo;
                    
                case 'quarter':
                    const quarterAgo = new Date(today);
                    quarterAgo.setMonth(quarterAgo.getMonth() - 3);
                    return appDate >= quarterAgo;
                    
                case 'year':
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    return appDate >= yearStart;
                    
                default:
                    return true;
            }
        });
    }
    
    return filtered;
}

// And update the applySorting function to add better logging:
function applySorting(applications) {
    const sorted = [...applications]; // Create a copy
    const { sortBy, sortDirection } = searchFilterState;
    
    console.log('Applying sort - By:', sortBy, 'Direction:', sortDirection);
    
    sorted.sort((a, b) => {
        let compareValue = 0;
        
        switch (sortBy) {
            case 'date':
                compareValue = new Date(a.applicationDate) - new Date(b.applicationDate);
                break;
                
            case 'company':
                compareValue = a.companyName.localeCompare(b.companyName);
                break;
                
            case 'status':
                // Define status order
                const statusOrder = ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];
                const aIndex = statusOrder.indexOf(a.status);
                const bIndex = statusOrder.indexOf(b.status);
                compareValue = aIndex - bIndex;
                break;
                
            default:
                compareValue = 0;
        }
        
        // Apply sort direction
        const result = sortDirection === 'asc' ? compareValue : -compareValue;
        
        // Log first comparison for debugging
        if (sorted.indexOf(a) === 0 && sorted.indexOf(b) === 1) {
            console.log('First comparison:', {
                a: sortBy === 'date' ? a.applicationDate : 
                   sortBy === 'company' ? a.companyName : a.status,
                b: sortBy === 'date' ? b.applicationDate : 
                   sortBy === 'company' ? b.companyName : b.status,
                compareValue,
                direction: sortDirection,
                result
            });
        }
        
        return result;
    });
    
    return sorted;
}

// Update results count display
function updateResultsCount(filteredCount, totalCount) {
    const resultCountElement = document.getElementById('resultCount');
    if (resultCountElement) {
        if (filteredCount === totalCount) {
            resultCountElement.textContent = `Showing all ${totalCount} applications`;
        } else {
            resultCountElement.textContent = `Showing ${filteredCount} of ${totalCount} applications`;
        }
    }
}

// Main function to filter, sort, and render
async function filterSortAndRender() {
    try {
        // Get all applications from database
        const allApplications = await getAllApplicationsFromDB();
        
        // Apply filters
        let filteredApplications = applyFilters(allApplications);
        
        // Apply sorting
        filteredApplications = applySorting(filteredApplications);
        
        // Update results count
        updateResultsCount(filteredApplications.length, allApplications.length);
        
        // Render the filtered and sorted applications
        renderApplicationsList(filteredApplications);
        
        console.log(`Showing ${filteredApplications.length} of ${allApplications.length} applications`);
        
    } catch (error) {
        console.error('Error in filterSortAndRender:', error);
    }
}

// Create HTML for a single application card
function createApplicationCard(application) {
    const card = document.createElement('div');
    card.className = 'application-card glass-card';
    card.dataset.id = application.id;
    
    // Calculate days until deadline
    const daysUntilDeadline = application.deadline ? 
        Math.ceil((new Date(application.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    
    // Determine deadline class
    let deadlineClass = '';
    if (daysUntilDeadline !== null) {
        if (daysUntilDeadline < 0) deadlineClass = 'deadline-passed';
        else if (daysUntilDeadline <= 3) deadlineClass = 'deadline-urgent';
        else if (daysUntilDeadline <= 7) deadlineClass = 'deadline-soon';
    }
    
    // Create progress percentage (simplified for now)
    const progressPercentage = {
        'to-apply': 0,
        'applied': 25,
        'in-progress': 50,
        'final-stage': 75,
        'completed': 100
    }[application.progressStage] || 0;
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="job-title">${application.jobTitle}</h3>
            <span class="status-badge status-${application.status}">${application.status}</span>
        </div>
        
        <div class="card-body">
            <div class="company-info">
                <strong>${application.companyName}</strong>
                ${application.location ? `<span class="location">📍 ${application.location}</span>` : ''}
            </div>
            
            <div class="card-details">
                <div class="detail-item">
                    <span class="detail-label">Applied:</span>
                    <span class="detail-value">${new Date(application.applicationDate).toLocaleDateString()}</span>
                </div>
                
                ${application.salary ? `
                    <div class="detail-item">
                        <span class="detail-label">Salary:</span>
                        <span class="detail-value">${application.salary}</span>
                    </div>
                ` : ''}
                
                ${application.deadline ? `
                    <div class="detail-item deadline-indicator ${deadlineClass}">
                        <span class="detail-label">Deadline:</span>
                        <span class="detail-value">
                            ${new Date(application.deadline).toLocaleDateString()}
                            ${daysUntilDeadline !== null ? `(${daysUntilDeadline > 0 ? `${daysUntilDeadline} days` : 'Passed'})` : ''}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
                <span class="progress-label">${application.progressStage.replace('-', ' ')}</span>
            </div>
            
            ${application.notes ? `
                <div class="notes-preview">
                    <p>${application.notes.substring(0, 100)}${application.notes.length > 100 ? '...' : ''}</p>
                </div>
            ` : ''}
        </div>
        
        <div class="card-actions">
            <button class="btn-icon edit-btn" data-id="${application.id}" title="Edit">
                ✏️
            </button>
            <button class="btn-icon delete-btn" data-id="${application.id}" title="Delete">
                🗑️
            </button>
            ${application.url ? `
                <a href="${application.url}" target="_blank" class="btn-icon" title="View posting">
                    🔗
                </a>
            ` : ''}
        </div>
    `;
    
    return card;
}

// 1. REPLACE your entire renderApplicationsList function with this:
async function renderApplicationsList(applications = null) {
    const listContainer = document.getElementById('listContainer');
    
    if (!listContainer) {
        console.error('List container not found');
        return;
    }
    
    // If no applications provided, fetch them
    if (applications === null) {
        try {
            applications = await getAllApplicationsFromDB();
            // When fetching fresh, apply current filters
            applications = applyFilters(applications);
            applications = applySorting(applications);
            updateResultsCount(applications.length, await getAllApplicationsFromDB().then(all => all.length));
        } catch (error) {
            console.error('Error fetching applications:', error);
            applications = [];
        }
    }
    
    // Clear existing content
    listContainer.innerHTML = '';
    
    // Show empty state or render applications
    if (applications.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No applications found</h3>
                <p>${searchFilterState.searchTerm || searchFilterState.statusFilter || searchFilterState.dateRangeFilter ? 
                    'Try adjusting your filters' : 
                    'Start tracking your job applications by clicking "Add Application"'}</p>
            </div>
        `;
    } else {
        // Create and append cards
        applications.forEach(app => {
            const card = createApplicationCard(app);
            listContainer.appendChild(card);
        });
        
        // Setup action button listeners after cards are rendered
        setupActionButtonsListeners();
        
        // STEP 22, 23 & 24 ADDITIONS: Enhance all cards with interview, contact, and document information
        const cards = document.querySelectorAll('.application-card');
        cards.forEach(async (card) => {
            const applicationId = card.dataset.id;
            try {
                const application = await getApplicationFromDB(applicationId);
                enhanceCardWithInterviews(card, application);
                enhanceCardWithContacts(card, application);
                enhanceCardWithDocuments(card, application);
            } catch (error) {
                console.error('Error enhancing card:', error);
            }
        });
    }
}
// Setup action buttons event listeners using event delegation - FIXED VERSION
function setupActionButtonsListeners() {
    const listContainer = document.getElementById('listContainer');
    const kanbanContainer = document.getElementById('kanbanContainer');
    
    // Setup for list view
    if (listContainer) {
        // Remove old listener if exists
        if (listContainer._clickHandler) {
            listContainer.removeEventListener('click', listContainer._clickHandler);
        }
        
        listContainer._clickHandler = handleActionButtonClick;
        listContainer.addEventListener('click', listContainer._clickHandler);
    }
    
    // Setup for kanban view - use event delegation
    if (kanbanContainer) {
        // Remove old listener if exists
        if (kanbanContainer._clickHandler) {
            kanbanContainer.removeEventListener('click', kanbanContainer._clickHandler);
        }
        
        kanbanContainer._clickHandler = (e) => {
            // Check if click is on edit or delete button within kanban
            if (e.target.closest('.kanban-card-edit') || e.target.closest('.delete-btn')) {
                handleActionButtonClick(e);
            }
        };
        
        kanbanContainer.addEventListener('click', kanbanContainer._clickHandler);
    }
}

async function handleActionButtonClick(e) {
    // Don't prevent default for links
    if (e.target.tagName !== 'A' && !e.target.closest('a')) {
        e.preventDefault();
    }
    
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn') || e.target.closest('.kanban-card-edit');
    
    // Handle edit button click
    if (editBtn) {
        e.stopPropagation();
        const applicationId = editBtn.dataset.id;
        console.log('Edit button clicked for ID:', applicationId);
        await loadApplicationForEdit(applicationId);
        return;
    }
    
    // Handle delete button click
    if (deleteBtn) {
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent any other handlers from executing
        
        // Check if any modal is already open
        if (isModalOpen()) {
            console.log('Modal already open, ignoring delete click');
            return;
        }
        
        // Check if button is already disabled (prevents double-click)
        if (deleteBtn.disabled || deleteBtn.dataset.processing === 'true') {
            console.log('Delete button already processing');
            return;
        }
        
        // Mark button as processing
        deleteBtn.dataset.processing = 'true';
        
        const applicationId = deleteBtn.dataset.id;
        const applicationCard = deleteBtn.closest('.application-card') || deleteBtn.closest('.kanban-card');
        
        if (!applicationCard) {
            console.error('Card not found');
            deleteBtn.dataset.processing = 'false';
            return;
        }
        
        // Get job title and company name
        let jobTitle, companyName;
        
        if (applicationCard.classList.contains('application-card')) {
            jobTitle = applicationCard.querySelector('.job-title')?.textContent || 'Unknown';
            companyName = applicationCard.querySelector('.company-info strong')?.textContent || 'Unknown';
        } else {
            jobTitle = applicationCard.querySelector('.kanban-card-title')?.textContent || 'Unknown';
            companyName = applicationCard.querySelector('.kanban-card-company')?.textContent || 'Unknown';
        }
        
        // Store original state for button
        const originalContent = deleteBtn.innerHTML;
        const wasDisabled = deleteBtn.disabled;
        
        // Disable button while modal is open
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.5';
        deleteBtn.style.cursor = 'not-allowed';
        
        // Show confirmation modal
        showConfirmModal(
            `Are you sure you want to delete the application for "${jobTitle}" at ${companyName}?`,
            {
                title: 'Delete Application',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                confirmClass: 'btn btn-danger',
                cancelClass: 'btn btn-secondary',
                onConfirm: async () => {
                    try {
                        // Show loading state
                        deleteBtn.innerHTML = '⏳';
                        
                        // Delete from database
                        await deleteApplicationFromDB(applicationId);
                        
                        // Animate card removal
                        applicationCard.style.transition = 'all 0.3s ease';
                        applicationCard.style.opacity = '0';
                        applicationCard.style.transform = 'translateX(-100%)';
                        
                        // Show success notification
                        notifySuccess(`Application for "${jobTitle}" at ${companyName} deleted successfully.`);
                        
                        // Refresh the appropriate view
                        setTimeout(() => {
                            if (document.getElementById('listView').classList.contains('active')) {
                                filterSortAndRender();
                            } else if (document.getElementById('kanbanView').classList.contains('active')) {
                                renderKanbanBoard();
                            }
                        }, 300);
                        
                    } catch (error) {
                        console.error('Error deleting application:', error);
                        
                        // Restore button state on error
                        deleteBtn.disabled = wasDisabled;
                        deleteBtn.innerHTML = originalContent;
                        deleteBtn.style.opacity = '';
                        deleteBtn.style.cursor = '';
                        deleteBtn.dataset.processing = 'false';
                        
                        notifyError('Failed to delete application. Please try again.');
                    }
                },
                onCancel: () => {
                    // Restore button state on cancel
                    deleteBtn.disabled = wasDisabled;
                    deleteBtn.innerHTML = originalContent;
                    deleteBtn.style.opacity = '';
                    deleteBtn.style.cursor = '';
                    deleteBtn.dataset.processing = 'false';
                },
                onClose: () => {
                    // Ensure button state is restored on close
                    if (deleteBtn) {
                        deleteBtn.disabled = wasDisabled;
                        deleteBtn.innerHTML = originalContent;
                        deleteBtn.style.opacity = '';
                        deleteBtn.style.cursor = '';
                        deleteBtn.dataset.processing = 'false';
                    }
                }
            }
        );
    }
}
// Load application data into form for editing
async function loadApplicationForEdit(applicationId) {
    try {
        // Fetch the application data
        const application = await getApplicationFromDB(applicationId);
        console.log('Loading application for edit:', application);
        
        // Update form title
        const formTitle = document.getElementById('formTitle');
        if (formTitle) {
            formTitle.textContent = 'Edit Application';
        }
        
        // Populate form fields
        document.getElementById('applicationId').value = application.id;
        document.getElementById('jobTitle').value = application.jobTitle || '';
        document.getElementById('companyName').value = application.companyName || '';
        document.getElementById('applicationDate').value = application.applicationDate || '';
        document.getElementById('status').value = application.status || '';
        document.getElementById('deadline').value = application.deadline || '';
        document.getElementById('url').value = application.url || '';
        document.getElementById('salary').value = application.salary || '';
        document.getElementById('location').value = application.location || '';
        document.getElementById('progressStage').value = application.progressStage || 'to-apply';
        document.getElementById('notes').value = application.notes || '';
        
        // Switch to home view
        switchView('home');
        
        // Update navigation active state
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === 'home') {
                btn.classList.add('active');
            }
        });
        
        // Focus on the job title field
        document.getElementById('jobTitle').focus();
        
    } catch (error) {
        console.error('Error loading application for edit:', error);
        notifyError('Failed to load application for editing');
    }
}

// Setup search, filter, and sort controls
function setupSearchFilterSort() {
    console.log('Setting up search, filter, and sort controls...');
    
    // Get control elements
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const resetButton = document.getElementById('resetFilters');
    
    // Setup search input with debounce
    if (searchInput) {
        const debouncedSearch = debounce((e) => {
            searchFilterState.searchTerm = e.target.value.toLowerCase();
            console.log('Search term:', searchFilterState.searchTerm);
            filterSortAndRender();
        }, 300);
        
        searchInput.addEventListener('input', debouncedSearch);
    }
    
    // Setup status filter
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            searchFilterState.statusFilter = e.target.value;
            console.log('Status filter:', searchFilterState.statusFilter);
            filterSortAndRender();
        });
    }
    
    // Setup date range filter
    if (dateRangeFilter) {
        dateRangeFilter.addEventListener('change', (e) => {
            searchFilterState.dateRangeFilter = e.target.value;
            console.log('Date range filter:', searchFilterState.dateRangeFilter);
            filterSortAndRender();
        });
    }
    
    // Setup sort buttons
sortButtons.forEach(button => {
    // Remove any existing listeners first
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const sortBy = newButton.dataset.sort;
        let sortDirection = newButton.dataset.direction || 'asc';
        
        // If clicking the already active button, toggle direction
        if (newButton.classList.contains('active')) {
            // Toggle direction
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            newButton.dataset.direction = sortDirection;
            
            // Update arrow immediately
            const arrow = newButton.querySelector('.sort-arrow');
            if (arrow) {
                arrow.textContent = sortDirection === 'asc' ? '↑' : '↓';
            }
            
            console.log('Toggling sort direction to:', sortDirection);
        } else {
            // Remove active class from all buttons
            document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            newButton.classList.add('active');
            
            // Set initial direction based on button's data attribute
            sortDirection = newButton.dataset.direction || 'asc';
            
            console.log('Activating sort button with direction:', sortDirection);
        }
        
        // Update global state
        searchFilterState.sortBy = sortBy;
        searchFilterState.sortDirection = sortDirection;
        
        console.log('Sort state updated - By:', sortBy, 'Direction:', sortDirection);
        
        // Apply the sort
        filterSortAndRender();
    });
});

    // Also, let's add a helper function to debug the sort state
function debugSortState() {
    console.log('Current sort state:', {
        sortBy: searchFilterState.sortBy,
        sortDirection: searchFilterState.sortDirection
    });
    
    document.querySelectorAll('.sort-btn').forEach(btn => {
        console.log('Button:', btn.dataset.sort, 
                    'Active:', btn.classList.contains('active'),
                    'Direction:', btn.dataset.direction,
                    'Arrow:', btn.querySelector('.sort-arrow')?.textContent);
    });
}

    
    // Setup reset button
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            // Reset state
            searchFilterState = {
                searchTerm: '',
                statusFilter: '',
                dateRangeFilter: '',
                sortBy: 'date',
                sortDirection: 'desc'
            };
            
            // Reset UI elements
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (dateRangeFilter) dateRangeFilter.value = '';
            
            // Reset sort buttons
            sortButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.sort === 'date') {
                    btn.classList.add('active');
                    btn.dataset.direction = 'desc';
                    const arrow = btn.querySelector('.sort-arrow');
                    if (arrow) arrow.textContent = '↓';
                } else {
                    btn.dataset.direction = 'asc';
                    const arrow = btn.querySelector('.sort-arrow');
                    if (arrow) arrow.textContent = '↑';
                }
            });
            
            console.log('Filters reset');
            filterSortAndRender();
        });
    }
}

// Redraw charts when theme changes
function setupDarkModeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Check for saved theme preference or default to light
    const currentTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', currentTheme);
    updateThemeToggleButton(currentTheme);
    
    // Add click listener to theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            // Update theme
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleButton(newTheme);
            
            // Add transition class for smooth theme change
            body.style.transition = 'background 0.3s ease';
            setTimeout(() => {
                body.style.transition = '';
            }, 300);
            
            // Redraw charts if on dashboard
            const dashboardView = document.getElementById('dashboardView');
            if (dashboardView && dashboardView.classList.contains('active')) {
                setTimeout(async () => {
                    const stats = await calculateDashboardStats();
                    const applications = await getAllApplicationsFromDB();
                    createStatusChart(stats, 'statusChart');
                    createTimelineChart(applications, 'timelineChart');
                }, 100);
            }
        });
    }
}

// Update theme toggle button appearance
function updateThemeToggleButton(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        themeToggle.setAttribute('aria-label', 
            theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
        );
    }
}

// Initialize the application
async function init() {
    try {
        await initDB();
        console.log('Database initialized');
        
        // Set up form handling
        setupApplicationForm();
        
        // Set up navigation
        setupNavButtons();
        
        // Set up dark mode toggle
        setupDarkModeToggle();

        // Initialize modal system
        initializeModalSystem();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, running init...');
    init();
});

// 2. REPLACE your entire calculateDashboardStats function with this:
async function calculateDashboardStats() {
    try {
        const applications = await getAllApplicationsFromDB();
        
        // Initialize statistics
        const stats = {
            total: applications.length,
            statusCounts: {
                applied: 0,
                screening: 0,
                interview: 0,
                offer: 0,
                rejected: 0,
                withdrawn: 0
            },
            activeApplications: 0,
            responseRate: 0,
            averageResponseTime: 0,
            upcomingDeadlines: 0,
            thisMonthApplications: 0
        };
        
        // Calculate status counts and other metrics
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        let totalResponseTime = 0;
        let responsesReceived = 0;
        
        applications.forEach(app => {
            // Count by status
            if (stats.statusCounts.hasOwnProperty(app.status)) {
                stats.statusCounts[app.status]++;
            }
            
            // Count active applications (not rejected or withdrawn)
            if (app.status !== 'rejected' && app.status !== 'withdrawn') {
                stats.activeApplications++;
            }
            
            // Calculate response metrics
            if (app.status !== 'applied') {
                responsesReceived++;
                const appDate = new Date(app.applicationDate);
                const responseTime = Math.ceil((currentDate - appDate) / (1000 * 60 * 60 * 24));
                totalResponseTime += responseTime;
            }
            
            // Count upcoming deadlines (within 7 days)
            if (app.deadline) {
                const deadline = new Date(app.deadline);
                const daysUntilDeadline = Math.ceil((deadline - currentDate) / (1000 * 60 * 60 * 24));
                if (daysUntilDeadline >= 0 && daysUntilDeadline <= 7) {
                    stats.upcomingDeadlines++;
                }
            }
            
            // Count applications from this month
            const appDate = new Date(app.applicationDate);
            if (appDate.getMonth() === currentMonth && appDate.getFullYear() === currentYear) {
                stats.thisMonthApplications++;
            }
        });
        
        // Calculate response rate percentage
        stats.responseRate = stats.total > 0 
            ? Math.round((responsesReceived / stats.total) * 100) 
            : 0;
        
        // Calculate average response time in days
        stats.averageResponseTime = responsesReceived > 0 
            ? Math.round(totalResponseTime / responsesReceived) 
            : 0;
        
        // STEP 22 ADDITION: Enhance stats with interview data
        let enhancedStats = enhanceDashboardWithInterviews(stats, applications);
        
        // STEP 23 ADDITION: Enhance stats with contact data
        enhancedStats = enhanceDashboardWithContacts(enhancedStats, applications);
        
        // STEP 24 ADDITION: Enhance stats with document data
        return enhanceDashboardWithDocuments(enhancedStats, applications);
        
    } catch (error) {
        console.error('Error calculating dashboard stats:', error);
        return null;
    }
}
// 3. REPLACE your entire renderDashboard function with this:
async function renderDashboard() {
    const statsContainer = document.getElementById('statsContainer');
    const chartsContainer = document.getElementById('chartsContainer');
    
    if (!statsContainer) {
        console.error('Stats container not found');
        return;
    }
    
    // Show loading state
    statsContainer.innerHTML = '<div class="loading">Loading statistics...</div>';
    
    // Calculate statistics
    const stats = await calculateDashboardStats();
    const applications = await getAllApplicationsFromDB();
    
    if (!stats) {
        statsContainer.innerHTML = '<div class="error">Failed to load statistics</div>';
        return;
    }
    
    // Render statistics cards
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card glass-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.total}</h3>
                    <p class="stat-label">Total Applications</p>
                </div>
            </div>
            
            <div class="stat-card glass-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.activeApplications}</h3>
                    <p class="stat-label">Active Applications</p>
                </div>
            </div>
            
            <!-- STEP 22 ADDITION: Interview statistics card -->
            <div class="stat-card glass-card">
                <div class="stat-icon">🎤</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.upcomingInterviews}</h3>
                    <p class="stat-label">Upcoming Interviews</p>
                </div>
            </div>
            
            <!-- STEP 23 ADDITION: Contacts statistics card -->
            <div class="stat-card glass-card">
                <div class="stat-icon">👥</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.totalContacts}</h3>
                    <p class="stat-label">Total Contacts</p>
                </div>
            </div>
            
            <!-- STEP 24 ADDITION: Documents statistics card -->
            <div class="stat-card glass-card">
                <div class="stat-icon">📎</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.totalDocuments}</h3>
                    <p class="stat-label">Documents Sent</p>
                </div>
            </div>
            
            <div class="stat-card glass-card">
                <div class="stat-icon">📈</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.responseRate}%</h3>
                    <p class="stat-label">Response Rate</p>
                </div>
            </div>
            
            <div class="stat-card glass-card">
                <div class="stat-icon">⏱️</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.averageResponseTime}</h3>
                    <p class="stat-label">Avg Response (Days)</p>
                </div>
            </div>
            
            <div class="stat-card glass-card">
                <div class="stat-icon">⏰</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.upcomingDeadlines}</h3>
                    <p class="stat-label">Upcoming Deadlines</p>
                </div>
            </div>
            
            <div class="stat-card glass-card">
                <div class="stat-icon">📅</div>
                <div class="stat-content">
                    <h3 class="stat-value">${stats.thisMonthApplications}</h3>
                    <p class="stat-label">This Month</p>
                </div>
            </div>
        </div>
        
        <div class="status-breakdown">
            <h3>Application Status Breakdown</h3>
            <div class="status-grid">
                ${Object.entries(stats.statusCounts).map(([status, count]) => `
                    <div class="status-item">
                        <span class="status-label">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        <span class="status-count status-${status}">${count}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Render charts
    if (chartsContainer) {
        chartsContainer.innerHTML = `
            <div class="charts-grid">
                <div class="chart-container glass-card">
                    <h3>Status Distribution</h3>
                    <canvas id="statusChart" width="400" height="300"></canvas>
                </div>
                
                <div class="chart-container glass-card">
                    <h3>Application Timeline</h3>
                    <canvas id="timelineChart" width="400" height="300"></canvas>
                </div>
            </div>
        `;
        
        // Draw charts after DOM updates
        setTimeout(() => {
            createStatusChart(stats, 'statusChart');
            createTimelineChart(applications, 'timelineChart');
        }, 100);
    }
}
// Create status distribution chart using Canvas (with slice percentages and side legend)
function createStatusChart(stats, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get status data
    const statusData = Object.entries(stats.statusCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
    
    if (statusData.length === 0) {
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary');
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data to display', width / 2, height / 2);
        return;
    }
    
    // Colors for each status
    const statusColors = {
        applied: '#667eea',
        screening: '#64b5f6',
        interview: '#4facfe',
        offer: '#66bb6a',
        rejected: '#f5576c',
        withdrawn: '#757575'
    };
    
    // Calculate dimensions - reserve space for legend on the right
    const legendWidth = 180;
    const chartArea = width - legendWidth - 20; // 20px gap between chart and legend
    const centerX = chartArea / 2;
    const centerY = height / 2;
    const radius = Math.min(chartArea, height) / 2 - 30; // Padding from edges
    
    // Calculate angles and total
    const total = statusData.reduce((sum, [_, count]) => sum + count, 0);
    let currentAngle = -Math.PI / 2; // Start at top
    
    // First pass: Draw pie slices
    statusData.forEach(([status, count]) => {
        const sliceAngle = (count / total) * 2 * Math.PI;
        
        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = statusColors[status] || '#999';
        ctx.fill();
        
        // Draw slice border
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--glass-bg-solid');
        ctx.lineWidth = 3;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });

    // Draw center circle for donut effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.35, 0, 2 * Math.PI);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--glass-bg-solid');
    ctx.fill();
    
    // Add subtle border to center circle
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--glass-border');
    ctx.lineWidth = 2;
    ctx.stroke();

    // Second pass: Draw percentage labels on slices
    currentAngle = -Math.PI / 2; // Reset angle
    
    statusData.forEach(([status, count]) => {
        const sliceAngle = (count / total) * 2 * Math.PI;
        const percentage = Math.round((count / total) * 100);
        
        // Only show percentage if slice is large enough (at least 5%)
        if (percentage >= 5) {
            // Calculate middle angle of slice
            const middleAngle = currentAngle + sliceAngle / 2;
            
            // Calculate text position (70% of radius from center)
            const textRadius = radius * 0.7;
            const textX = centerX + Math.cos(middleAngle) * textRadius;
            const textY = centerY + Math.sin(middleAngle) * textRadius;
            
            // Set text style
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add text shadow for better readability
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            // Draw percentage
            ctx.fillText(`${percentage}%`, textX, textY);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        currentAngle += sliceAngle;
    });

    // Draw legend on the right side
    const legendX = chartArea + 20; // Start legend after chart area + gap
    let legendY = 40;

    // Legend title
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Status Breakdown', legendX, legendY);

    legendY += 25;

    // Legend items
    statusData.forEach(([status, count]) => {
        const percentage = Math.round((count / total) * 100);
        
        // Color box
        ctx.fillStyle = statusColors[status] || '#999';
        ctx.fillRect(legendX, legendY - 8, 14, 14);
        
        // Add border to color box
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--glass-border');
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY - 8, 14, 14);
        
        // Label with count and percentage
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Capitalize first letter of status
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const label = `${statusLabel}: ${count} (${percentage}%)`;
        ctx.fillText(label, legendX + 22, legendY);
        
        legendY += 22;
    });

    // Add total at the bottom of legend
    legendY += 10;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary');
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`Total: ${total}`, legendX, legendY);
}

function createTimelineChart(applications, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (applications.length === 0) {
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary');
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data to display', width / 2, height / 2);
        return;
    }
    
    // Group applications by month
    const monthlyData = {};
    applications.forEach(app => {
        const date = new Date(app.applicationDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
    
    // Get last 6 months INCLUDING future months
    const months = [];
    const counts = [];
    const now = new Date();

    // Start from 3 months ago to include future applications
    for (let i = 3; i >= -2; i--) {  // Changed from 5 to 3, and 0 to -2
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        
        months.push(monthName);
        counts.push(monthlyData[monthKey] || 0);
    }
    
    // Calculate dimensions
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxCount = Math.max(...counts, 1);
    
    // Draw axes
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary');
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw bars
    const barWidth = chartWidth / months.length * 0.6;
    const barSpacing = chartWidth / months.length;
    
    months.forEach((month, index) => {
        const count = counts[index];
        const barHeight = (count / maxCount) * chartHeight;
        const x = padding + (index * barSpacing) + (barSpacing - barWidth) / 2;
        const y = height - padding - barHeight;
        
        // Draw bar with gradient effect
        const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw value on top of bar
        if (count > 0) {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(count, x + barWidth / 2, y - 5);
        }
        
        // Draw month label
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(month, x + barWidth / 2, height - padding + 20);
    });
    
    // Draw title
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Applications Over Time', width / 2, 20);
}

// ===== KANBAN BOARD SECTION =====
// Complete Kanban Board implementation with fixed drag-and-drop

// Kanban Board Variables
let draggedCard = null;
let draggedApplicationId = null;
let originalStatus = null;
let kanbanRefreshInterval = null;

// Status to progress stage mapping
const statusToProgressStageMap = {
    'applied': 'applied',
    'screening': 'in-progress',
    'interview': 'in-progress',
    'offer': 'final-stage',
    'rejected': 'completed',
    'withdrawn': 'completed'
};

// ===== COMPLETE DRAGHANDLERS OBJECT WITH ALL FUNCTIONS =====
// Replace your entire dragHandlers object with this complete version:

// Unified drag and drop handlers object for better organization
const dragHandlers = {
    start: function(e) {
        const card = e.target.closest('.kanban-card');
        if (!card || card.classList.contains('updating')) {
            e.preventDefault();
            return;
        }
        
        draggedCard = card;
        draggedApplicationId = card.dataset.id;
        
        const parentColumn = card.closest('.kanban-column');
        originalStatus = parentColumn ? parentColumn.dataset.status : null;
        
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedApplicationId);
        
        console.log('Drag started:', draggedApplicationId);
    },
    
    end: function(e) {
        // Clean up all cards
        document.querySelectorAll('.kanban-card').forEach(c => {
            c.classList.remove('dragging');
            c.style.opacity = '';
            c.style.pointerEvents = '';
            c.style.cursor = '';
        });
        
        // Clean up columns
        document.querySelectorAll('.kanban-column').forEach(col => {
            col.classList.remove('drag-over');
        });
        
        console.log('Drag ended');
    },
    
    over: function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const column = e.target.closest('.kanban-column');
        if (column && !column.classList.contains('drag-over')) {
            document.querySelectorAll('.kanban-column').forEach(col => {
                col.classList.remove('drag-over');
            });
            column.classList.add('drag-over');
        }
        
        const container = e.target.closest('.kanban-cards-container');
        if (container && draggedCard) {
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedCard);
            } else {
                container.insertBefore(draggedCard, afterElement);
            }
        }
    },
    
    drop: async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // CRITICAL: Capture all necessary data immediately
        const currentCard = draggedCard;
        const currentApplicationId = draggedApplicationId;
        const currentOriginalStatus = originalStatus;
        
        const dropZone = e.target.closest('.kanban-cards-container') || 
                        e.target.closest('.kanban-column')?.querySelector('.kanban-cards-container');
        
        if (!dropZone || !currentCard || !currentApplicationId || !currentOriginalStatus) {
            document.querySelectorAll('.kanban-column').forEach(col => {
                col.classList.remove('drag-over');
            });
            // Reset globals
            draggedCard = null;
            draggedApplicationId = null;
            originalStatus = null;
            return;
        }
        
        const newStatus = dropZone.dataset.status;
        
        // Clean up columns immediately
        document.querySelectorAll('.kanban-column').forEach(col => {
            col.classList.remove('drag-over');
        });
        
        if (currentOriginalStatus !== newStatus) {
            // Add updating class
            currentCard.classList.add('updating');
            
            try {
                const application = await getApplicationFromDB(currentApplicationId);
                
                application.status = newStatus;
                application.progressStage = statusToProgressStageMap[newStatus] || application.progressStage;
                application.updatedAt = new Date().toISOString();
                
                if (!application.statusHistory) {
                    application.statusHistory = [];
                }
                application.statusHistory.push({
                    from: currentOriginalStatus,
                    to: newStatus,
                    date: new Date().toISOString(),
                    action: 'kanban-drag'
                });
                
                await updateApplicationInDB(application);
                
                console.log(`Moved "${application.jobTitle}" from ${currentOriginalStatus} to ${newStatus}`);
                
                // Format the status name properly for display
                const formatStatus = (status) => {
                    return status
                        .replace(/[^\w\s-]/gi, '') // Remove special characters
                        .replace(/-/g, ' ')        // Replace hyphens with spaces
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                };
                
                notifySuccess(`Moved "${application.jobTitle}" to ${formatStatus(newStatus)}`);
                
                // Remove updating class and add success
                if (currentCard.parentNode) {
                    currentCard.classList.remove('updating');
                    currentCard.classList.add('drop-success');
                    
                    // Remove success class after animation
                    setTimeout(() => {
                        // Double check the card still exists
                        if (currentCard && currentCard.parentNode && currentCard.classList) {
                            currentCard.classList.remove('drop-success');
                        }
                    }, 500);
                }
                
                updateKanbanUI();
                
            } catch (error) {
                console.error('Error updating status:', error);
                notifyError('Failed to update application status. Please try again.');
                
                // Remove updating class
                if (currentCard && currentCard.parentNode) {
                    currentCard.classList.remove('updating');
                }
                
                // Move card back to original column
                const originalColumn = document.querySelector(`.kanban-cards-container[data-status="${currentOriginalStatus}"]`);
                if (originalColumn && currentCard && currentCard.parentNode) {
                    originalColumn.appendChild(currentCard);
                }
            }
        }
        
        // Reset globals after everything is done
        draggedCard = null;
        draggedApplicationId = null;
        originalStatus = null;
    },
    
    enter: function(e) {
        const column = e.target.closest('.kanban-column');
        if (column) {
            column.classList.add('drag-over');
        }
    },
    
    leave: function(e) {
        const column = e.target.closest('.kanban-column');
        if (column && !column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
        }
    }
}; // <-- THIS CLOSING BRACE AND SEMICOLON WERE MISSING!
// Main function to render the Kanban Board
async function renderKanbanBoard() {
    const kanbanContainer = document.getElementById('kanbanContainer');
    
    if (!kanbanContainer) {
        console.error('Kanban container not found');
        return;
    }
    
    // Show loading state
    kanbanContainer.innerHTML = '<div class="loading">Loading kanban board...</div>';
    
    try {
        // Fetch all applications
        const applications = await getAllApplicationsFromDB();
        
        // Define kanban columns based on status
        const kanbanColumns = [
            { id: 'applied', title: 'Applied', icon: '📤' },
            { id: 'screening', title: 'Screening', icon: '👀' },
            { id: 'interview', title: 'Interview', icon: '🎤' },
            { id: 'offer', title: 'Offer', icon: '🎉' },
            { id: 'rejected', title: 'Rejected', icon: '❌' },
            { id: 'withdrawn', title: 'Withdrawn', icon: '🚪' }
        ];
        
        // Group applications by status
        const groupedApplications = groupApplicationsByStatus(applications);
        
        // Clear container and create columns
        kanbanContainer.innerHTML = '';
        kanbanContainer.className = 'kanban-board';
        
        // Create each column
        kanbanColumns.forEach(column => {
            const columnElement = createKanbanColumn(column, groupedApplications[column.id] || []);
            kanbanContainer.appendChild(columnElement);
        });
        
        console.log('Kanban board rendered successfully');
        
        // Setup drag and drop after rendering
        setTimeout(() => {
            setupDragAndDrop();
            setupActionButtonsListeners(); // Add this line
        }, 100);
        
    } catch (error) {
        console.error('Error rendering kanban board:', error);
        kanbanContainer.innerHTML = '<div class="error">Failed to load kanban board</div>';
    }
}

// Group applications by status
function groupApplicationsByStatus(applications) {
    return applications.reduce((groups, app) => {
        const status = app.status || 'applied';
        if (!groups[status]) {
            groups[status] = [];
        }
        groups[status].push(app);
        return groups;
    }, {});
}

// Create a kanban column
function createKanbanColumn(column, applications) {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'kanban-column';
    columnDiv.dataset.status = column.id;
    
    // Column header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'kanban-column-header';
    headerDiv.innerHTML = `
        <div class="kanban-column-title">
            <span class="kanban-column-icon">${column.icon}</span>
            <h3>${column.title}</h3>
        </div>
        <span class="kanban-column-count">${applications.length}</span>
    `;
    
    // Cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'kanban-cards-container';
    cardsContainer.dataset.status = column.id;
    
    // Add empty state or cards
    if (applications.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'kanban-empty-state';
        emptyState.innerHTML = '<p>No applications</p>';
        cardsContainer.appendChild(emptyState);
    } else {
        // Sort applications by date (newest first)
        applications.sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate));
        
        // Create cards
        applications.forEach(app => {
            const card = createKanbanCard(app);
            cardsContainer.appendChild(card);
        });
    }
    
    columnDiv.appendChild(headerDiv);
    columnDiv.appendChild(cardsContainer);
    
    return columnDiv;
}

// Create a kanban card - FIXED VERSION
function createKanbanCard(application) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.dataset.id = application.id;
    card.dataset.applicationDate = application.applicationDate;
    card.draggable = true;
    card.setAttribute('draggable', 'true');
    
    // Calculate days since application
    const daysAgo = Math.floor((new Date() - new Date(application.applicationDate)) / (1000 * 60 * 60 * 24));
    const daysAgoText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
    
    // Check for upcoming deadline
    let deadlineHtml = '';
    if (application.deadline) {
        const daysUntilDeadline = Math.ceil((new Date(application.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilDeadline >= 0 && daysUntilDeadline <= 7) {
            deadlineHtml = `<div class="kanban-card-deadline">⏰ ${daysUntilDeadline} days left</div>`;
        } else if (daysUntilDeadline < 0) {
            deadlineHtml = `<div class="kanban-card-deadline deadline-passed">⏰ Deadline passed</div>`;
        }
    }
    
    // Progress indicator based on progress stage
    const progressStageIcons = {
        'to-apply': '📝',
        'applied': '✅',
        'in-progress': '🔄',
        'final-stage': '🎯',
        'completed': '🏁'
    };
    const progressIcon = progressStageIcons[application.progressStage] || '📋';
    
    card.innerHTML = `
        <div class="kanban-card-header">
            <h4 class="kanban-card-title">${application.jobTitle}</h4>
            <div class="kanban-card-actions">
                <span class="kanban-card-progress" title="Progress: ${application.progressStage}">${progressIcon}</span>
                <button class="kanban-card-edit" data-id="${application.id}" title="Edit">
                    ✏️
                </button>
            </div>
        </div>
        
        <div class="kanban-card-company">${application.companyName}</div>
        
        ${application.location ? `<div class="kanban-card-location">📍 ${application.location}</div>` : ''}
        
        <div class="kanban-card-date">${daysAgoText}</div>
        
        ${deadlineHtml}
        
        ${application.salary ? `<div class="kanban-card-salary">💰 ${application.salary}</div>` : ''}
        
        ${application.notes ? `
            <div class="kanban-card-notes">
                ${application.notes.substring(0, 60)}${application.notes.length > 60 ? '...' : ''}
            </div>
        ` : ''}
    `;
    
    // Note: We're NOT adding individual event listeners here anymore
    // Event delegation will handle clicks on edit buttons
    
    return card;
}

// Setup drag and drop event listeners using event delegation
function setupDragAndDrop() {
    console.log('Setting up drag and drop...');
    
    // Use event delegation on the kanban container instead of individual cards
    const kanbanContainer = document.getElementById('kanbanContainer');
    if (!kanbanContainer) return;
    
    // Remove any existing listeners
    kanbanContainer.removeEventListener('dragstart', handleDragStartDelegated);
    kanbanContainer.removeEventListener('dragend', handleDragEndDelegated);
    kanbanContainer.removeEventListener('dragover', dragHandlers.over);
    kanbanContainer.removeEventListener('drop', dragHandlers.drop);
    kanbanContainer.removeEventListener('dragenter', dragHandlers.enter);
    kanbanContainer.removeEventListener('dragleave', dragHandlers.leave);
    
    // Add delegated event listeners
    kanbanContainer.addEventListener('dragstart', handleDragStartDelegated);
    kanbanContainer.addEventListener('dragend', handleDragEndDelegated);
    kanbanContainer.addEventListener('dragover', dragHandlers.over);
    kanbanContainer.addEventListener('drop', dragHandlers.drop);
    kanbanContainer.addEventListener('dragenter', dragHandlers.enter);
    kanbanContainer.addEventListener('dragleave', dragHandlers.leave);
    
    console.log('Drag and drop setup complete with event delegation');
}

// Delegated drag start handler
function handleDragStartDelegated(e) {
    const card = e.target.closest('.kanban-card');
    if (card && card.draggable) {
        dragHandlers.start(e);
    }
}

// Delegated drag end handler  
function handleDragEndDelegated(e) {
    const card = e.target.closest('.kanban-card');
    if (card) {
        dragHandlers.end(e);
        
        // Only reset globals if drop hasn't occurred yet
        // This gives drop handler time to execute
        setTimeout(() => {
            // Only reset if drop handler hasn't already reset them
            if (draggedCard !== null) {
                draggedCard = null;
                draggedApplicationId = null;
                originalStatus = null;
            }
        }, 200);
    }
}

// Get the element after which the dragged element should be inserted
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Update the Kanban UI (counts, empty states, etc.)
function updateKanbanUI() {
    const columns = document.querySelectorAll('.kanban-column');
    
    columns.forEach(column => {
        const cardsContainer = column.querySelector('.kanban-cards-container');
        const countElement = column.querySelector('.kanban-column-count');
        const cards = cardsContainer.querySelectorAll('.kanban-card');
        const cardCount = cards.length;
        
        // Update count
        if (countElement) {
            countElement.textContent = cardCount;
            countElement.classList.add('count-updated');
            setTimeout(() => {
                countElement.classList.remove('count-updated');
            }, 300);
        }
        
        // Handle empty state
        const emptyState = cardsContainer.querySelector('.kanban-empty-state');
        
        if (cardCount === 0) {
            if (!emptyState) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'kanban-empty-state fade-in';
                emptyDiv.innerHTML = '<p>No applications</p>';
                cardsContainer.appendChild(emptyDiv);
            }
        } else if (emptyState) {
            emptyState.classList.add('fade-out');
            setTimeout(() => {
                emptyState.remove();
            }, 300);
        }
    });
    
    // No need to reattach listeners since we're using event delegation
    console.log('Kanban UI updated');
}

// Optional: Auto-refresh functionality
function startKanbanAutoRefresh(intervalMs = 30000) {
    // Clear any existing interval
    stopKanbanAutoRefresh();
    
    // Set up new interval
    kanbanRefreshInterval = setInterval(() => {
        const kanbanView = document.getElementById('kanbanView');
        if (kanbanView && kanbanView.classList.contains('active')) {
            console.log('Auto-refreshing kanban board...');
            renderKanbanBoard();
        }
    }, intervalMs);
}

function stopKanbanAutoRefresh() {
    if (kanbanRefreshInterval) {
        clearInterval(kanbanRefreshInterval);
        kanbanRefreshInterval = null;
    }
}

// ===== END OF KANBAN BOARD SECTION =====

// ===== MODAL SYSTEM SECTION =====
// Complete modal system implementation with robust state management

// Modal state management
const modalState = {
    activeModals: [],
    isAnimating: false,
    focusStack: [],
    scrollPosition: 0
};

// Modal configuration defaults
const modalDefaults = {
    size: 'medium', // small, medium, large
    closeOnBackdrop: true,
    closeOnEscape: true,
    animate: true,
    focusTrap: true,
    scrollLock: true,
    zIndex: 9999
};

// Initialize modal system
function initializeModalSystem() {
    console.log('Initializing modal system...');
    
    // Ensure modal container exists
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error('Modal container not found in DOM');
        return false;
    }
    
    // Ensure modal structure
    let modal = modalContainer.querySelector('.modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal modal-medium';
        modal.innerHTML = '<div class="modal-content"></div>';
        modalContainer.appendChild(modal);
    }
    
    // Set initial state
    modalContainer.style.display = 'none';
    modalContainer.classList.remove('active');
    
    console.log('Modal system initialized successfully');
    return true;
}

// Create modal instance
class Modal {
    constructor(content, options = {}) {
        this.id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.content = content;
        this.options = { ...modalDefaults, ...options };
        this.container = document.getElementById('modalContainer');
        this.modal = this.container.querySelector('.modal');
        this.isOpen = false;
        this.listeners = new Map();
        
        // Bind methods
        this.handleBackdropClick = this.handleBackdropClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleCloseClick = this.handleCloseClick.bind(this);
    }
    
    // Open modal
    async open() {
        if (this.isOpen || modalState.isAnimating) {
            console.warn('Modal is already open or animating');
            return false;
        }
        
        // Check if another modal is active
        if (modalState.activeModals.length > 0 && !this.options.allowMultiple) {
            console.warn('Another modal is already active');
            return false;
        }
        
        modalState.isAnimating = true;
        
        try {
            // Store current focus
            modalState.focusStack.push(document.activeElement);
            
            // Scroll lock
            if (this.options.scrollLock) {
                modalState.scrollPosition = window.scrollY;
                document.body.style.position = 'fixed';
                document.body.style.top = `-${modalState.scrollPosition}px`;
                document.body.style.width = '100%';
            }
            
            // Set content
            this.setContent();
            
            // Apply size class
            this.modal.className = `modal modal-${this.options.size}`;
            
            // Show container
            this.container.style.display = 'flex';
            
            // Wait for next frame to ensure display change is applied
            await this.nextFrame();
            
            // Add active class for animation
            this.container.classList.add('active');
            
            if (this.options.animate) {
                this.modal.classList.add('modal-enter');
                await this.waitForAnimation(300);
                this.modal.classList.remove('modal-enter');
            }
            
            // Setup event listeners
            this.setupListeners();
            
            // Focus management
            if (this.options.focusTrap) {
                this.setupFocusTrap();
                this.focusFirstElement();
            }
            
            // Update state
            this.isOpen = true;
            modalState.activeModals.push(this);
            modalState.isAnimating = false;
            
            // Call onOpen callback
            if (this.options.onOpen) {
                this.options.onOpen(this.modal, this);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error opening modal:', error);
            modalState.isAnimating = false;
            return false;
        }
    }
    
    // Close modal
    async close() {
        if (!this.isOpen || modalState.isAnimating) {
            return false;
        }
        
        modalState.isAnimating = true;
        
        try {
            // Call onBeforeClose callback
            if (this.options.onBeforeClose) {
                const shouldClose = await this.options.onBeforeClose(this.modal, this);
                if (shouldClose === false) {
                    modalState.isAnimating = false;
                    return false;
                }
            }
            
            // Remove event listeners
            this.removeListeners();
            
            // Animate out
            if (this.options.animate) {
                this.modal.classList.add('modal-exit');
                this.container.classList.remove('active');
                await this.waitForAnimation(300);
            } else {
                this.container.classList.remove('active');
            }
            
            // Hide container
            this.container.style.display = 'none';
            this.modal.classList.remove('modal-exit');
            
            // Clear content
            const modalContent = this.modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.innerHTML = '';
            }
            
            // Restore scroll
            if (this.options.scrollLock && modalState.activeModals.length === 1) {
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                window.scrollTo(0, modalState.scrollPosition);
            }
            
            // Restore focus
            const previousFocus = modalState.focusStack.pop();
            if (previousFocus && previousFocus.focus) {
                previousFocus.focus();
            }
            
            // Update state
            this.isOpen = false;
            modalState.activeModals = modalState.activeModals.filter(m => m !== this);
            modalState.isAnimating = false;
            
            // Call onClose callback
            if (this.options.onClose) {
                this.options.onClose(this.modal, this);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error closing modal:', error);
            modalState.isAnimating = false;
            return false;
        }
    }
    
    // Set modal content
    setContent() {
        const modalContent = this.modal.querySelector('.modal-content');
        
        if (this.options.title) {
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h3>${this.options.title}</h3>
                    <button class="modal-close" aria-label="Close modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.content}
                </div>
            `;
        } else {
            modalContent.innerHTML = this.content;
        }
    }
    
    // Setup event listeners
    setupListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            this.listeners.set('closeBtn', this.handleCloseClick);
            closeBtn.addEventListener('click', this.handleCloseClick);
        }
        
        // Backdrop click
        if (this.options.closeOnBackdrop) {
            this.listeners.set('backdrop', this.handleBackdropClick);
            this.container.addEventListener('click', this.handleBackdropClick);
        }
        
        // Escape key
        if (this.options.closeOnEscape) {
            this.listeners.set('escape', this.handleEscapeKey);
            document.addEventListener('keydown', this.handleEscapeKey);
        }
    }
    
    // Remove event listeners
    removeListeners() {
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn && this.listeners.has('closeBtn')) {
            closeBtn.removeEventListener('click', this.listeners.get('closeBtn'));
        }
        
        if (this.listeners.has('backdrop')) {
            this.container.removeEventListener('click', this.listeners.get('backdrop'));
        }
        
        if (this.listeners.has('escape')) {
            document.removeEventListener('keydown', this.listeners.get('escape'));
        }
        
        this.listeners.clear();
    }
    
    // Event handlers
    handleBackdropClick(e) {
        if (e.target === this.container) {
            e.stopPropagation();
            this.close();
        }
    }
    
    handleEscapeKey(e) {
        if (e.key === 'Escape' && modalState.activeModals[modalState.activeModals.length - 1] === this) {
            e.preventDefault();
            this.close();
        }
    }
    
    handleCloseClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
    }
    
    // Focus management
    setupFocusTrap() {
        const focusableElements = this.modal.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );
        
        this.focusableElements = Array.from(focusableElements);
        
        if (this.focusableElements.length === 0) return;
        
        this.firstFocusable = this.focusableElements[0];
        this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
        
        this.handleTabKey = (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === this.firstFocusable) {
                    e.preventDefault();
                    this.lastFocusable.focus();
                }
            } else {
                if (document.activeElement === this.lastFocusable) {
                    e.preventDefault();
                    this.firstFocusable.focus();
                }
            }
        };
        
        this.modal.addEventListener('keydown', this.handleTabKey);
    }
    
    focusFirstElement() {
        if (this.focusableElements && this.focusableElements.length > 0) {
            // Prefer focusing on the first input or button that's not the close button
            const preferredElement = this.focusableElements.find(el => 
                (el.tagName === 'INPUT' || el.tagName === 'BUTTON') && 
                !el.classList.contains('modal-close')
            );
            
            if (preferredElement) {
                preferredElement.focus();
            } else {
                this.firstFocusable.focus();
            }
        }
    }
    
    // Utility methods
    nextFrame() {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
    }
    
    waitForAnimation(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }
}

// Public API functions

// Show modal
function showModal(content, options = {}) {
    const modal = new Modal(content, options);
    modal.open();
    return modal;
}

// Hide active modal
function hideModal() {
    const activeModal = modalState.activeModals[modalState.activeModals.length - 1];
    if (activeModal) {
        return activeModal.close();
    }
    return false;
}

// Hide all modals
function hideAllModals() {
    const promises = modalState.activeModals.map(modal => modal.close());
    return Promise.all(promises);
}

// Show alert modal
function showAlertModal(message, options = {}) {
    const defaultOptions = {
        title: 'Alert',
        size: 'small',
        closeOnBackdrop: true,
        closeOnEscape: true
    };
    
    const content = `
        <div class="modal-message">
            <p>${message}</p>
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-primary modal-ok-btn">OK</button>
        </div>
    `;
    
    const modal = showModal(content, { ...defaultOptions, ...options });
    
    // Auto-focus OK button after modal opens
    modal.options.onOpen = (modalElement) => {
        const okBtn = modalElement.querySelector('.modal-ok-btn');
        if (okBtn) {
            okBtn.addEventListener('click', () => modal.close(), { once: true });
            okBtn.focus();
        }
    };
    
    return modal;
}

// Show confirmation modal
function showConfirmModal(message, options = {}) {
    const defaultOptions = {
        title: 'Confirm',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        confirmClass: 'btn btn-primary',
        cancelClass: 'btn btn-secondary',
        size: 'small',
        closeOnBackdrop: false,
        closeOnEscape: true
    };
    
    const settings = { ...defaultOptions, ...options };
    
    const content = `
        <div class="modal-message">
            <p>${message}</p>
        </div>
        <div class="modal-actions">
            <button type="button" class="${settings.cancelClass} modal-cancel-btn">
                ${settings.cancelText}
            </button>
            <button type="button" class="${settings.confirmClass} modal-confirm-btn">
                ${settings.confirmText}
            </button>
        </div>
    `;
    
    const modal = showModal(content, settings);
    
    // Setup button handlers after modal opens
    modal.options.onOpen = (modalElement) => {
        const confirmBtn = modalElement.querySelector('.modal-confirm-btn');
        const cancelBtn = modalElement.querySelector('.modal-cancel-btn');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                await modal.close();
                if (settings.onConfirm) {
                    // Small delay to ensure modal is fully closed
                    setTimeout(() => settings.onConfirm(), 100);
                }
            }, { once: true });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => {
                await modal.close();
                if (settings.onCancel) {
                    setTimeout(() => settings.onCancel(), 100);
                }
            }, { once: true });
            
            // Focus cancel button by default (safer option)
            cancelBtn.focus();
        }
    };
    
    return modal;
}

// Show form modal
function showFormModal(formHtml, options = {}) {
    const defaultOptions = {
        title: 'Form',
        size: 'medium',
        closeOnBackdrop: false,
        closeOnEscape: true,
        submitText: 'Submit',
        cancelText: 'Cancel'
    };
    
    const settings = { ...defaultOptions, ...options };
    
    const modal = showModal(formHtml, settings);
    
    modal.options.onOpen = (modalElement) => {
        const form = modalElement.querySelector('form');
        if (!form) return;
        
        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            if (settings.onSubmit) {
                const result = await settings.onSubmit(data, form, modal);
                
                // Close modal if onSubmit returns true or nothing
                if (result !== false) {
                    modal.close();
                }
            }
        });
        
        // Focus first form field
        const firstInput = form.querySelector('input, textarea, select');
        if (firstInput) {
            firstInput.focus();
        }
    };
    
    return modal;
}

// Check if any modal is open
function isModalOpen() {
    return modalState.activeModals.length > 0;
}

// Get active modal
function getActiveModal() {
    return modalState.activeModals[modalState.activeModals.length - 1] || null;
}

// ===== END OF MODAL SYSTEM SECTION =====

// ===== NOTIFICATION SYSTEM SECTION =====
// Toast-style notifications for user feedback

// Notification queue to manage multiple notifications
const notificationQueue = [];
let activeNotifications = 0;
const MAX_VISIBLE_NOTIFICATIONS = 3;

// Create and show a notification
function showNotification(message, type = 'info', duration = 4000) {
    const notificationContainer = document.getElementById('notificationContainer');
    
    if (!notificationContainer) {
        console.error('Notification container not found');
        return;
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';
    
    // Add icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    // Create notification content
    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" aria-label="Close notification">&times;</button>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Setup close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.onclick = () => removeNotification(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    });
    
    // Track active notifications
    activeNotifications++;
    
    // Auto-remove after duration
    const timeoutId = setTimeout(() => {
        removeNotification(notification);
    }, duration);
    
    // Store reference for potential early removal
    notification._timeoutId = timeoutId;
    
    // Manage notification stacking
    updateNotificationPositions();
    
    return notification;
}

// Remove a notification
function removeNotification(notification) {
    if (!notification || notification._removing) return;
    
    notification._removing = true;
    
    // Clear timeout if exists
    if (notification._timeoutId) {
        clearTimeout(notification._timeoutId);
    }
    
    // Animate out
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';
    
    // Remove from DOM after animation
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
            activeNotifications--;
            updateNotificationPositions();
        }
    }, 300);
}

// Update positions of all notifications for stacking
function updateNotificationPositions() {
    const notifications = document.querySelectorAll('.notification');
    const spacing = 10; // Space between notifications
    let offset = 0;
    
    notifications.forEach((notification, index) => {
        if (!notification._removing) {
            notification.style.top = `${offset}px`;
            offset += notification.offsetHeight + spacing;
        }
    });
}

// Show success notification
function notifySuccess(message, duration = 4000) {
    return showNotification(message, 'success', duration);
}

// Show error notification
function notifyError(message, duration = 6000) {
    return showNotification(message, 'error', duration);
}

// Show warning notification
function notifyWarning(message, duration = 5000) {
    return showNotification(message, 'warning', duration);
}

// Show info notification
function notifyInfo(message, duration = 4000) {
    return showNotification(message, 'info', duration);
}

// Clear all notifications
function clearAllNotifications() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => removeNotification(notification));
}

// ===== END OF NOTIFICATION SYSTEM SECTION =====
// ===== STEP 22: INTERVIEW FUNCTIONALITY =====
// Add this code to your script.js file after the notification system section

// Interview Management Functions
async function addInterview(applicationId, interviewData) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        if (!application.interviewDates) {
            application.interviewDates = [];
        }
        
        // Add new interview with unique ID
        const interview = {
            id: generateId(),
            date: interviewData.date,
            time: interviewData.time,
            type: interviewData.type,
            location: interviewData.location,
            interviewer: interviewData.interviewer,
            notes: interviewData.notes,
            status: 'scheduled', // scheduled, completed, cancelled
            createdAt: new Date().toISOString()
        };
        
        application.interviewDates.push(interview);
        application.updatedAt = new Date().toISOString();
        
        await updateApplicationInDB(application);
        
        notifySuccess('Interview scheduled successfully!');
        return interview;
        
    } catch (error) {
        console.error('Error adding interview:', error);
        notifyError('Failed to schedule interview');
        throw error;
    }
}

async function updateInterview(applicationId, interviewId, updatedData) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        const interviewIndex = application.interviewDates.findIndex(i => i.id === interviewId);
        if (interviewIndex === -1) {
            throw new Error('Interview not found');
        }
        
        application.interviewDates[interviewIndex] = {
            ...application.interviewDates[interviewIndex],
            ...updatedData,
            updatedAt: new Date().toISOString()
        };
        
        application.updatedAt = new Date().toISOString();
        await updateApplicationInDB(application);
        
        notifySuccess('Interview updated successfully!');
        
    } catch (error) {
        console.error('Error updating interview:', error);
        notifyError('Failed to update interview');
        throw error;
    }
}

async function deleteInterview(applicationId, interviewId) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        application.interviewDates = application.interviewDates.filter(i => i.id !== interviewId);
        application.updatedAt = new Date().toISOString();
        
        await updateApplicationInDB(application);
        
        notifySuccess('Interview removed successfully!');
        
    } catch (error) {
        console.error('Error deleting interview:', error);
        notifyError('Failed to remove interview');
        throw error;
    }
}

// Show interview scheduling modal
function showInterviewModal(applicationId, existingInterview = null) {
    const isEdit = existingInterview !== null;
    const title = isEdit ? 'Edit Interview' : 'Schedule Interview';
    
    // Get current date and time for defaults
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    const formHtml = `
        <form id="interviewForm" class="modal-form">
            <div class="form-group">
                <label for="interviewDate">Interview Date *</label>
                <input type="date" id="interviewDate" name="date" required 
                       value="${isEdit ? existingInterview.date : currentDate}"
                       min="${currentDate}">
                <span class="error-message"></span>
            </div>
            
            <div class="form-group">
                <label for="interviewTime">Interview Time *</label>
                <input type="time" id="interviewTime" name="time" required
                       value="${isEdit ? existingInterview.time : currentTime}">
                <span class="error-message"></span>
            </div>
            
            <div class="form-group">
                <label for="interviewType">Interview Type *</label>
                <select id="interviewType" name="type" required>
                    <option value="">Select Type</option>
                    <option value="phone" ${isEdit && existingInterview.type === 'phone' ? 'selected' : ''}>Phone</option>
                    <option value="video" ${isEdit && existingInterview.type === 'video' ? 'selected' : ''}>Video</option>
                    <option value="in-person" ${isEdit && existingInterview.type === 'in-person' ? 'selected' : ''}>In-Person</option>
                    <option value="technical" ${isEdit && existingInterview.type === 'technical' ? 'selected' : ''}>Technical</option>
                    <option value="behavioral" ${isEdit && existingInterview.type === 'behavioral' ? 'selected' : ''}>Behavioral</option>
                    <option value="panel" ${isEdit && existingInterview.type === 'panel' ? 'selected' : ''}>Panel</option>
                </select>
                <span class="error-message"></span>
            </div>
            
            <div class="form-group">
                <label for="interviewLocation">Location/Link</label>
                <input type="text" id="interviewLocation" name="location" 
                       placeholder="Office address or video call link"
                       value="${isEdit ? existingInterview.location || '' : ''}">
                <span class="error-message"></span>
            </div>
            
            <div class="form-group">
                <label for="interviewer">Interviewer(s)</label>
                <input type="text" id="interviewer" name="interviewer" 
                       placeholder="Name and title"
                       value="${isEdit ? existingInterview.interviewer || '' : ''}">
                <span class="error-message"></span>
            </div>
            
            <div class="form-group">
                <label for="interviewNotes">Notes</label>
                <textarea id="interviewNotes" name="notes" rows="3" 
                          placeholder="Preparation notes, topics to discuss, etc.">${isEdit ? existingInterview.notes || '' : ''}</textarea>
                <span class="error-message"></span>
            </div>
            
            ${isEdit ? `
                <div class="form-group">
                    <label for="interviewStatus">Status</label>
                    <select id="interviewStatus" name="status">
                        <option value="scheduled" ${existingInterview.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="completed" ${existingInterview.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${existingInterview.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
            ` : ''}
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    ${isEdit ? 'Update Interview' : 'Schedule Interview'}
                </button>
            </div>
        </form>
    `;
    
    showFormModal(formHtml, {
        title: title,
        size: 'medium',
        onSubmit: async (data) => {
            try {
                if (isEdit) {
                    await updateInterview(applicationId, existingInterview.id, data);
                } else {
                    await addInterview(applicationId, data);
                }
                
                // Refresh the current view
                const activeView = document.querySelector('.view.active');
                if (activeView && activeView.id === 'listView') {
                    renderApplicationsList();
                } else if (activeView && activeView.id === 'kanbanView') {
                    renderKanbanBoard();
                }
                
                return true; // Close modal
            } catch (error) {
                return false; // Keep modal open
            }
        }
    });
}

// ===== FIX FOR INTERVIEW DELETE FUNCTIONALITY =====
// Replace your existing showInterviewsModal function with this fixed version:

async function showInterviewsModal(applicationId) {
    try {
        const application = await getApplicationFromDB(applicationId);
        const interviews = application.interviewDates || [];
        
        let content = `
            <div class="interviews-list">
                <div class="interviews-header">
                    <h4>${application.jobTitle} at ${application.companyName}</h4>
                    <button class="btn btn-primary btn-small" onclick="window.handleAddInterviewClick('${applicationId}')">
                        + Add Interview
                    </button>
                </div>
        `;
        
        if (interviews.length === 0) {
            content += `
                <div class="empty-state-small">
                    <p>No interviews scheduled yet</p>
                </div>
            `;
        } else {
            // Sort interviews by date/time
            const sortedInterviews = [...interviews].sort((a, b) => {
                const dateA = new Date(`${a.date} ${a.time}`);
                const dateB = new Date(`${b.date} ${b.time}`);
                return dateA - dateB;
            });
            
            content += '<div class="interviews-grid">';
            
            sortedInterviews.forEach(interview => {
                const interviewDate = new Date(`${interview.date} ${interview.time}`);
                const isPast = interviewDate < new Date();
                const statusClass = interview.status === 'completed' ? 'completed' : 
                                  interview.status === 'cancelled' ? 'cancelled' : 
                                  isPast ? 'past' : 'upcoming';
                
                // Escape the interview data for safe passing
                const interviewDataEscaped = encodeURIComponent(JSON.stringify(interview));
                
                content += `
                    <div class="interview-card ${statusClass}">
                        <div class="interview-card-header">
                            <span class="interview-type">${interview.type}</span>
                            <span class="interview-status status-${interview.status}">${interview.status}</span>
                        </div>
                        <div class="interview-datetime">
                            <strong>${new Date(interview.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                            })}</strong> at ${interview.time}
                        </div>
                        ${interview.location ? `<div class="interview-location">📍 ${interview.location}</div>` : ''}
                        ${interview.interviewer ? `<div class="interview-interviewer">👤 ${interview.interviewer}</div>` : ''}
                        ${interview.notes ? `<div class="interview-notes">${interview.notes}</div>` : ''}
                        <div class="interview-actions">
                            <button class="btn-icon small" onclick="window.handleEditInterviewClick('${applicationId}', '${interviewDataEscaped}')" title="Edit">
                                ✏️
                            </button>
                            <button class="btn-icon small delete" onclick="window.handleDeleteInterviewClick('${applicationId}', '${interview.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });
            
            content += '</div>';
        }
        
        content += '</div>';
        
        showModal(content, {
            title: 'Interview Schedule',
            size: 'large',
            closeOnBackdrop: true
        });
        
    } catch (error) {
        console.error('Error showing interviews:', error);
        notifyError('Failed to load interviews');
    }
}

// Update the handleDeleteInterviewClick function to close modal first:
window.handleDeleteInterviewClick = async function(applicationId, interviewId) {
    // Close the interviews modal first
    await hideModal();
    
    // Small delay to ensure modal is fully closed
    setTimeout(() => {
        showConfirmModal(
            'Are you sure you want to delete this interview?',
            {
                title: 'Delete Interview',
                confirmText: 'Delete',
                confirmClass: 'btn btn-danger',
                onConfirm: async () => {
                    try {
                        await deleteInterview(applicationId, interviewId);
                        
                        // After successful deletion, show the interviews modal again
                        setTimeout(() => {
                            showInterviewsModal(applicationId);
                        }, 100);
                        
                    } catch (error) {
                        console.error('Error deleting interview:', error);
                        // On error, still show the interviews modal again
                        setTimeout(() => {
                            showInterviewsModal(applicationId);
                        }, 100);
                    }
                },
                onCancel: () => {
                    // If cancelled, reopen the interviews modal
                    setTimeout(() => {
                        showInterviewsModal(applicationId);
                    }, 100);
                }
            }
        );
    }, 100);
};

// Add these helper functions to handle the modal transitions:

window.handleAddInterviewClick = async function(applicationId) {
    // Close current modal first
    await hideModal();
    
    // Small delay to ensure modal is fully closed
    setTimeout(() => {
        showInterviewModal(applicationId);
    }, 100);
};

window.handleEditInterviewClick = async function(applicationId, interviewDataEscaped) {
    // Decode the interview data
    const interview = JSON.parse(decodeURIComponent(interviewDataEscaped));
    
    // Close current modal first
    await hideModal();
    
    // Small delay to ensure modal is fully closed
    setTimeout(() => {
        showInterviewModal(applicationId, interview);
    }, 100);
};

function enhanceCardWithInterviews(card, application) {
    const interviews = application.interviewDates || [];
    const upcomingInterviews = interviews.filter(i => 
        i.status === 'scheduled' && 
        new Date(`${i.date} ${i.time}`) >= new Date()
    ).length;
    
    // Add interview indicator to card header if there are any scheduled interviews
    if (upcomingInterviews > 0) {
        const cardHeader = card.querySelector('.card-header');
        const statusBadge = cardHeader.querySelector('.status-badge');
        
        // Create interview indicator
        const interviewIndicator = document.createElement('span');
        interviewIndicator.className = 'card-interview-indicator';
        interviewIndicator.title = `${upcomingInterviews} upcoming interview${upcomingInterviews > 1 ? 's' : ''} scheduled`;
        interviewIndicator.innerHTML = `
            <span class="indicator-icon">🎤</span>
            <span class="indicator-count">${upcomingInterviews}</span>
        `;
        
        // Insert before status badge
        cardHeader.insertBefore(interviewIndicator, statusBadge);
    }
    
    // Keep the existing interview badge (shows total interviews)
    if (interviews.length > 0) {
        const cardHeader = card.querySelector('.card-header');
        const interviewBadge = document.createElement('span');
        interviewBadge.className = 'interview-badge';
        interviewBadge.innerHTML = `🎤 ${upcomingInterviews}/${interviews.length}`;
        interviewBadge.title = `${upcomingInterviews} upcoming, ${interviews.length} total interviews`;
        cardHeader.appendChild(interviewBadge);
    }
    
    // Add interview button to card actions
    const cardActions = card.querySelector('.card-actions');
    const interviewBtn = document.createElement('button');
    interviewBtn.className = 'btn-icon interview-btn';
    interviewBtn.dataset.id = application.id;
    interviewBtn.title = 'Manage Interviews';
    interviewBtn.innerHTML = '🎤';
    interviewBtn.onclick = (e) => {
        e.stopPropagation();
        showInterviewsModal(application.id);
    };
    
    // Insert before the edit button
    const editBtn = cardActions.querySelector('.edit-btn');
    cardActions.insertBefore(interviewBtn, editBtn);
}

// Helper function to enhance dashboard statistics with interview data
function enhanceDashboardWithInterviews(stats, applications) {
    // Calculate interview statistics
    let totalInterviews = 0;
    let upcomingInterviews = 0;
    let completedInterviews = 0;
    
    applications.forEach(app => {
        if (app.interviewDates && app.interviewDates.length > 0) {
            app.interviewDates.forEach(interview => {
                totalInterviews++;
                if (interview.status === 'completed') {
                    completedInterviews++;
                } else if (interview.status === 'scheduled') {
                    const interviewDate = new Date(`${interview.date} ${interview.time}`);
                    if (interviewDate >= new Date()) {
                        upcomingInterviews++;
                    }
                }
            });
        }
    });
    
    // Add to stats object
    stats.totalInterviews = totalInterviews;
    stats.upcomingInterviews = upcomingInterviews;
    stats.completedInterviews = completedInterviews;
    
    return stats;
}

console.log('✅ Step 22: Interview functionality added successfully!');

// ===== END OF INTERVIEW FUNCTIONALITY =====
// ===== STEP 23: CONTACTS FUNCTIONALITY =====
// Add this code to your script.js file after the interview functionality section

// 1. REPLACE the addContact function (removed primary contact logic):
async function addContact(applicationId, contactData) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        if (!application.contacts) {
            application.contacts = [];
        }
        
        // Add new contact with unique ID
        const contact = {
            id: generateId(),
            name: contactData.name,
            title: contactData.title,
            type: contactData.type, // recruiter, hiring-manager, technical, hr, other
            email: contactData.email,
            phone: contactData.phone,
            linkedin: contactData.linkedin,
            notes: contactData.notes,
            createdAt: new Date().toISOString()
        };
        
        application.contacts.push(contact);
        application.updatedAt = new Date().toISOString();
        
        await updateApplicationInDB(application);
        
        notifySuccess('Contact added successfully!');
        return contact;
        
    } catch (error) {
        console.error('Error adding contact:', error);
        notifyError('Failed to add contact');
        throw error;
    }
}
// 2. REPLACE the updateContact function (removed primary contact logic):
async function updateContact(applicationId, contactId, updatedData) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        const contactIndex = application.contacts.findIndex(c => c.id === contactId);
        if (contactIndex === -1) {
            throw new Error('Contact not found');
        }
        
        application.contacts[contactIndex] = {
            ...application.contacts[contactIndex],
            ...updatedData,
            updatedAt: new Date().toISOString()
        };
        
        application.updatedAt = new Date().toISOString();
        await updateApplicationInDB(application);
        
        notifySuccess('Contact updated successfully!');
        
    } catch (error) {
        console.error('Error updating contact:', error);
        notifyError('Failed to update contact');
        throw error;
    }
}

async function deleteContact(applicationId, contactId) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        application.contacts = application.contacts.filter(c => c.id !== contactId);
        application.updatedAt = new Date().toISOString();
        
        await updateApplicationInDB(application);
        
        notifySuccess('Contact removed successfully!');
        
    } catch (error) {
        console.error('Error deleting contact:', error);
        notifyError('Failed to remove contact');
        throw error;
    }
}

// 3. REPLACE the showContactModal function (removed primary contact checkbox):
function showContactModal(applicationId, existingContact = null) {
    const isEdit = existingContact !== null;
    const title = isEdit ? 'Edit Contact' : 'Add Contact';
    
    const formHtml = `
        <form id="contactForm" class="modal-form contact-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="contactName">Name *</label>
                    <input type="text" id="contactName" name="name" required 
                           value="${isEdit ? existingContact.name : ''}"
                           placeholder="John Doe">
                    <span class="error-message"></span>
                </div>
                
                <div class="form-group">
                    <label for="contactTitle">Title/Role</label>
                    <input type="text" id="contactTitle" name="title"
                           value="${isEdit ? existingContact.title || '' : ''}"
                           placeholder="Senior Recruiter">
                    <span class="error-message"></span>
                </div>
            </div>
            
            <div class="form-group">
                <label for="contactType">Contact Type *</label>
                <select id="contactType" name="type" required>
                    <option value="">Select Type</option>
                    <option value="recruiter" ${isEdit && existingContact.type === 'recruiter' ? 'selected' : ''}>Recruiter</option>
                    <option value="hiring-manager" ${isEdit && existingContact.type === 'hiring-manager' ? 'selected' : ''}>Hiring Manager</option>
                    <option value="technical" ${isEdit && existingContact.type === 'technical' ? 'selected' : ''}>Technical Interviewer</option>
                    <option value="hr" ${isEdit && existingContact.type === 'hr' ? 'selected' : ''}>HR Representative</option>
                    <option value="other" ${isEdit && existingContact.type === 'other' ? 'selected' : ''}>Other</option>
                </select>
                <span class="error-message"></span>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="contactEmail">Email</label>
                    <input type="email" id="contactEmail" name="email"
                           value="${isEdit ? existingContact.email || '' : ''}"
                           placeholder="john.doe@company.com">
                    <span class="error-message"></span>
                </div>
                
                <div class="form-group">
                    <label for="contactPhone">Phone</label>
                    <input type="tel" id="contactPhone" name="phone"
                           value="${isEdit ? existingContact.phone || '' : ''}"
                           placeholder="+1 (555) 123-4567">
                    <span class="error-message"></span>
                </div>
            </div>
            
            <div class="form-group">
                <label for="contactLinkedin">LinkedIn Profile</label>
                <input type="url" id="contactLinkedin" name="linkedin"
                       value="${isEdit ? existingContact.linkedin || '' : ''}"
                       placeholder="https://linkedin.com/in/johndoe">
                <span class="error-message"></span>
            </div>
            
            <div class="form-group full-width">
                <label for="contactNotes">Notes</label>
                <textarea id="contactNotes" name="notes" rows="3" 
                          placeholder="Additional notes about this contact...">${isEdit ? existingContact.notes || '' : ''}</textarea>
                <span class="error-message"></span>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    ${isEdit ? 'Update Contact' : 'Add Contact'}
                </button>
            </div>
        </form>
    `;
    
    showFormModal(formHtml, {
        title: title,
        size: 'medium',
        onSubmit: async (data) => {
            try {
                if (isEdit) {
                    await updateContact(applicationId, existingContact.id, data);
                } else {
                    await addContact(applicationId, data);
                }
                
                // Refresh the current view
                const activeView = document.querySelector('.view.active');
                if (activeView && activeView.id === 'listView') {
                    renderApplicationsList();
                } else if (activeView && activeView.id === 'kanbanView') {
                    renderKanbanBoard();
                }
                
                return true; // Close modal
            } catch (error) {
                return false; // Keep modal open
            }
        }
    });
}

// 4. REPLACE the showContactsModal function (removed primary badge and fixed delete):
async function showContactsModal(applicationId) {
    try {
        const application = await getApplicationFromDB(applicationId);
        const contacts = application.contacts || [];
        
        let content = `
            <div class="contacts-list">
                <div class="contacts-header">
                    <h4>${application.jobTitle} at ${application.companyName}</h4>
                    <button class="btn btn-primary btn-small" onclick="window.handleAddContactClick('${applicationId}')">
                        + Add Contact
                    </button>
                </div>
        `;
        
        if (contacts.length === 0) {
            content += `
                <div class="empty-state-contacts">
                    <p>No contacts added yet</p>
                </div>
            `;
        } else {
            content += '<div class="contacts-grid">';
            
            // Sort contacts by name
            const sortedContacts = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
            
            sortedContacts.forEach(contact => {
                const contactDataEscaped = encodeURIComponent(JSON.stringify(contact));
                
                content += `
                    <div class="contact-card">
                        <div class="contact-card-header">
                            <h5 class="contact-name">${contact.name}</h5>
                            <span class="contact-type ${contact.type}">${contact.type.replace('-', ' ')}</span>
                        </div>
                        ${contact.title ? `<div class="contact-title">${contact.title}</div>` : ''}
                        
                        <div class="contact-details">
                            ${contact.email ? `
                                <div class="contact-detail">
                                    <span class="contact-detail-icon">📧</span>
                                    <a href="mailto:${contact.email}">${contact.email}</a>
                                </div>
                            ` : ''}
                            ${contact.phone ? `
                                <div class="contact-detail">
                                    <span class="contact-detail-icon">📱</span>
                                    <a href="tel:${contact.phone}">${contact.phone}</a>
                                </div>
                            ` : ''}
                            ${contact.linkedin ? `
                                <div class="contact-detail">
                                    <span class="contact-detail-icon">💼</span>
                                    <a href="${contact.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn Profile</a>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${contact.notes ? `<div class="contact-notes">${contact.notes}</div>` : ''}
                        
                        <div class="contact-actions">
                            <button class="btn-icon small" onclick="window.handleEditContactClick('${applicationId}', '${contactDataEscaped}')" title="Edit">
                                ✏️
                            </button>
                            <button class="btn-icon small delete" onclick="window.handleDeleteContactClick('${applicationId}', '${contact.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });
            
            content += '</div>';
        }
        
        content += '</div>';
        
        showModal(content, {
            title: 'Contacts',
            size: 'large',
            closeOnBackdrop: true
        });
        
    } catch (error) {
        console.error('Error showing contacts:', error);
        notifyError('Failed to load contacts');
    }
}
// Modal transition helpers for contacts
window.handleAddContactClick = async function(applicationId) {
    await hideModal();
    setTimeout(() => {
        showContactModal(applicationId);
    }, 100);
};

window.handleEditContactClick = async function(applicationId, contactDataEscaped) {
    const contact = JSON.parse(decodeURIComponent(contactDataEscaped));
    await hideModal();
    setTimeout(() => {
        showContactModal(applicationId, contact);
    }, 100);
};

// 5. ADD this new function to handle contact deletion (similar to interview delete fix):
window.handleDeleteContactClick = async function(applicationId, contactId) {
    // Close the contacts modal first
    await hideModal();
    
    // Small delay to ensure modal is fully closed
    setTimeout(() => {
        showConfirmModal(
            'Are you sure you want to delete this contact?',
            {
                title: 'Delete Contact',
                confirmText: 'Delete',
                confirmClass: 'btn btn-danger',
                onConfirm: async () => {
                    try {
                        await deleteContact(applicationId, contactId);
                        
                        // After successful deletion, show the contacts modal again
                        setTimeout(() => {
                            showContactsModal(applicationId);
                        }, 100);
                        
                    } catch (error) {
                        console.error('Error deleting contact:', error);
                        // On error, still show the contacts modal again
                        setTimeout(() => {
                            showContactsModal(applicationId);
                        }, 100);
                    }
                },
                onCancel: () => {
                    // If cancelled, reopen the contacts modal
                    setTimeout(() => {
                        showContactsModal(applicationId);
                    }, 100);
                }
            }
        );
    }, 100);
};

// Helper function to enhance application cards with contact information
function enhanceCardWithContacts(card, application) {
    const contacts = application.contacts || [];
    
    if (contacts.length > 0) {
        // Add contact indicator to card header
        const cardHeader = card.querySelector('.card-header');
        const interviewIndicator = cardHeader.querySelector('.card-interview-indicator');
        
        const contactIndicator = document.createElement('span');
        contactIndicator.className = 'card-contact-indicator';
        contactIndicator.title = `${contacts.length} contact${contacts.length > 1 ? 's' : ''} saved`;
        contactIndicator.innerHTML = `
            <span class="indicator-icon">👥</span>
            <span class="indicator-count">${contacts.length}</span>
        `;
        
        // Insert after interview indicator if it exists, otherwise before status badge
        if (interviewIndicator) {
            interviewIndicator.after(contactIndicator);
        } else {
            const statusBadge = cardHeader.querySelector('.status-badge');
            cardHeader.insertBefore(contactIndicator, statusBadge);
        }
    }
    
    // Add contact button to card actions
    const cardActions = card.querySelector('.card-actions');
    const contactBtn = document.createElement('button');
    contactBtn.className = 'btn-icon contact-btn';
    contactBtn.dataset.id = application.id;
    contactBtn.title = 'Manage Contacts';
    contactBtn.innerHTML = '👥';
    contactBtn.onclick = (e) => {
        e.stopPropagation();
        showContactsModal(application.id);
    };
    
    // Insert after interview button if it exists, otherwise before edit button
    const interviewBtn = cardActions.querySelector('.interview-btn');
    if (interviewBtn) {
        interviewBtn.after(contactBtn);
    } else {
        const editBtn = cardActions.querySelector('.edit-btn');
        cardActions.insertBefore(contactBtn, editBtn);
    }
}

// Helper function to enhance dashboard statistics with contact data
function enhanceDashboardWithContacts(stats, applications) {
    // Calculate contact statistics
    let totalContacts = 0;
    let applicationsWithContacts = 0;
    
    applications.forEach(app => {
        if (app.contacts && app.contacts.length > 0) {
            applicationsWithContacts++;
            totalContacts += app.contacts.length;
        }
    });
    
    // Add to stats object
    stats.totalContacts = totalContacts;
    stats.applicationsWithContacts = applicationsWithContacts;
    
    return stats;
}

console.log('✅ Step 23: Contacts functionality added successfully!');

// ===== END OF CONTACTS FUNCTIONALITY =====
// ===== STEP 24: DOCUMENT TRACKING FUNCTIONALITY =====
// Add this code to your script.js file after the contacts functionality section

// Document Management Functions
async function addDocument(applicationId, documentData) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        if (!application.documents) {
            application.documents = [];
        }
        
        // Add new document with unique ID
        const document = {
            id: generateId(),
            name: documentData.name,
            type: documentData.type, // resume, cover-letter, portfolio, reference, other
            version: documentData.version || '1.0',
            dateSent: documentData.dateSent,
            notes: documentData.notes,
            createdAt: new Date().toISOString()
        };
        
        application.documents.push(document);
        application.updatedAt = new Date().toISOString();
        
        await updateApplicationInDB(application);
        
        notifySuccess('Document added successfully!');
        return document;
        
    } catch (error) {
        console.error('Error adding document:', error);
        notifyError('Failed to add document');
        throw error;
    }
}

async function updateDocument(applicationId, documentId, updatedData) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        const documentIndex = application.documents.findIndex(d => d.id === documentId);
        if (documentIndex === -1) {
            throw new Error('Document not found');
        }
        
        application.documents[documentIndex] = {
            ...application.documents[documentIndex],
            ...updatedData,
            updatedAt: new Date().toISOString()
        };
        
        application.updatedAt = new Date().toISOString();
        await updateApplicationInDB(application);
        
        notifySuccess('Document updated successfully!');
        
    } catch (error) {
        console.error('Error updating document:', error);
        notifyError('Failed to update document');
        throw error;
    }
}

async function deleteDocument(applicationId, documentId) {
    try {
        const application = await getApplicationFromDB(applicationId);
        
        application.documents = application.documents.filter(d => d.id !== documentId);
        application.updatedAt = new Date().toISOString();
        
        await updateApplicationInDB(application);
        
        notifySuccess('Document removed successfully!');
        
    } catch (error) {
        console.error('Error deleting document:', error);
        notifyError('Failed to remove document');
        throw error;
    }
}

// Show document form modal
function showDocumentModal(applicationId, existingDocument = null) {
    const isEdit = existingDocument !== null;
    const title = isEdit ? 'Edit Document' : 'Add Document';
    
    // Get current date for default
    const currentDate = new Date().toISOString().split('T')[0];
    
    const formHtml = `
        <form id="documentForm" class="modal-form document-form">
            <div class="form-group">
                <label for="documentName">Document Name *</label>
                <input type="text" id="documentName" name="name" required 
                       value="${isEdit ? existingDocument.name : ''}"
                       placeholder="e.g., Resume_CompanyName_v2">
                <span class="error-message"></span>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="documentType">Document Type *</label>
                    <select id="documentType" name="type" required>
                        <option value="">Select Type</option>
                        <option value="resume" ${isEdit && existingDocument.type === 'resume' ? 'selected' : ''}>Resume/CV</option>
                        <option value="cover-letter" ${isEdit && existingDocument.type === 'cover-letter' ? 'selected' : ''}>Cover Letter</option>
                        <option value="portfolio" ${isEdit && existingDocument.type === 'portfolio' ? 'selected' : ''}>Portfolio</option>
                        <option value="reference" ${isEdit && existingDocument.type === 'reference' ? 'selected' : ''}>References</option>
                        <option value="other" ${isEdit && existingDocument.type === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                    <span class="error-message"></span>
                </div>
                
                <div class="form-group">
                    <label for="documentVersion">Version</label>
                    <input type="text" id="documentVersion" name="version"
                           value="${isEdit ? existingDocument.version || '1.0' : '1.0'}"
                           placeholder="1.0">
                    <span class="error-message"></span>
                </div>
            </div>
            
            <div class="form-group">
                <label for="documentDate">Date Sent *</label>
                <input type="date" id="documentDate" name="dateSent" required
                       value="${isEdit ? existingDocument.dateSent : currentDate}">
                <span class="error-message"></span>
            </div>
            
            <div class="form-group full-width">
                <label for="documentNotes">Notes</label>
                <textarea id="documentNotes" name="notes" rows="3" 
                          placeholder="e.g., Tailored for senior position, emphasized leadership experience...">${isEdit ? existingDocument.notes || '' : ''}</textarea>
                <span class="error-message"></span>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    ${isEdit ? 'Update Document' : 'Add Document'}
                </button>
            </div>
        </form>
    `;
    
    showFormModal(formHtml, {
        title: title,
        size: 'medium',
        onSubmit: async (data) => {
            try {
                if (isEdit) {
                    await updateDocument(applicationId, existingDocument.id, data);
                } else {
                    await addDocument(applicationId, data);
                }
                
                // Refresh the current view
                const activeView = document.querySelector('.view.active');
                if (activeView && activeView.id === 'listView') {
                    renderApplicationsList();
                } else if (activeView && activeView.id === 'kanbanView') {
                    renderKanbanBoard();
                }
                
                return true; // Close modal
            } catch (error) {
                return false; // Keep modal open
            }
        }
    });
}

// Show all documents for an application
async function showDocumentsModal(applicationId) {
    try {
        const application = await getApplicationFromDB(applicationId);
        const documents = application.documents || [];
        
        let content = `
            <div class="documents-list">
                <div class="documents-header">
                    <h4>${application.jobTitle} at ${application.companyName}</h4>
                    <button class="btn btn-primary btn-small" onclick="window.handleAddDocumentClick('${applicationId}')">
                        + Add Document
                    </button>
                </div>
        `;
        
        if (documents.length === 0) {
            content += `
                <div class="empty-state-documents">
                    <p>No documents tracked yet</p>
                </div>
            `;
        } else {
            content += '<div class="documents-grid">';
            
            // Sort documents by date sent (newest first)
            const sortedDocuments = [...documents].sort((a, b) => 
                new Date(b.dateSent) - new Date(a.dateSent)
            );
            
            sortedDocuments.forEach(document => {
                const documentDataEscaped = encodeURIComponent(JSON.stringify(document));
                
                // Get document icon based on type
                const documentIcons = {
                    'resume': '📄',
                    'cover-letter': '📝',
                    'portfolio': '🎨',
                    'reference': '👤',
                    'other': '📎'
                };
                const icon = documentIcons[document.type] || '📎';
                
                content += `
                    <div class="document-card">
                        <div class="document-card-header">
                            <h5 class="document-name">${document.name}</h5>
                            <span class="document-type ${document.type}">${document.type.replace('-', ' ')}</span>
                        </div>
                        
                        <div class="document-details">
                            <div class="document-detail">
                                <span class="document-detail-icon">${icon}</span>
                                <span>Type: ${document.type.replace('-', ' ')}</span>
                            </div>
                            <div class="document-detail">
                                <span class="document-detail-icon">📅</span>
                                <span>Sent: ${new Date(document.dateSent).toLocaleDateString()}</span>
                            </div>
                            ${document.version ? `
                                <div class="document-detail">
                                    <span class="document-detail-icon">🔢</span>
                                    <span class="document-version">Version ${document.version}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${document.notes ? `<div class="document-notes">${document.notes}</div>` : ''}
                        
                        <div class="document-actions">
                            <button class="btn-icon small" onclick="window.handleEditDocumentClick('${applicationId}', '${documentDataEscaped}')" title="Edit">
                                ✏️
                            </button>
                            <button class="btn-icon small delete" onclick="window.handleDeleteDocumentClick('${applicationId}', '${document.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });
            
            content += '</div>';
        }
        
        content += '</div>';
        
        showModal(content, {
            title: 'Documents',
            size: 'large',
            closeOnBackdrop: true
        });
        
    } catch (error) {
        console.error('Error showing documents:', error);
        notifyError('Failed to load documents');
    }
}

// Modal transition helpers for documents
window.handleAddDocumentClick = async function(applicationId) {
    await hideModal();
    setTimeout(() => {
        showDocumentModal(applicationId);
    }, 100);
};

window.handleEditDocumentClick = async function(applicationId, documentDataEscaped) {
    const document = JSON.parse(decodeURIComponent(documentDataEscaped));
    await hideModal();
    setTimeout(() => {
        showDocumentModal(applicationId, document);
    }, 100);
};

window.handleDeleteDocumentClick = async function(applicationId, documentId) {
    await hideModal();
    setTimeout(() => {
        showConfirmModal(
            'Are you sure you want to delete this document record?',
            {
                title: 'Delete Document',
                confirmText: 'Delete',
                confirmClass: 'btn btn-danger',
                onConfirm: async () => {
                    try {
                        await deleteDocument(applicationId, documentId);
                        setTimeout(() => {
                            showDocumentsModal(applicationId);
                        }, 100);
                    } catch (error) {
                        console.error('Error deleting document:', error);
                        setTimeout(() => {
                            showDocumentsModal(applicationId);
                        }, 100);
                    }
                },
                onCancel: () => {
                    setTimeout(() => {
                        showDocumentsModal(applicationId);
                    }, 100);
                }
            }
        );
    }, 100);
};

// Helper function to enhance application cards with document information
function enhanceCardWithDocuments(card, application) {
    const documents = application.documents || [];
    
    if (documents.length > 0) {
        // Add document indicator to card header
        const cardHeader = card.querySelector('.card-header');
        const contactIndicator = cardHeader.querySelector('.card-contact-indicator');
        
        const documentIndicator = document.createElement('span');
        documentIndicator.className = 'card-document-indicator';
        documentIndicator.title = `${documents.length} document${documents.length > 1 ? 's' : ''} tracked`;
        documentIndicator.innerHTML = `
            <span class="indicator-icon">📎</span>
            <span class="indicator-count">${documents.length}</span>
        `;
        
        // Insert after contact indicator if it exists, otherwise after interview indicator
        if (contactIndicator) {
            contactIndicator.after(documentIndicator);
        } else {
            const interviewIndicator = cardHeader.querySelector('.card-interview-indicator');
            if (interviewIndicator) {
                interviewIndicator.after(documentIndicator);
            } else {
                const statusBadge = cardHeader.querySelector('.status-badge');
                cardHeader.insertBefore(documentIndicator, statusBadge);
            }
        }
    }
    
    // Add document button to card actions
    const cardActions = card.querySelector('.card-actions');
    const documentBtn = document.createElement('button');
    documentBtn.className = 'btn-icon document-btn';
    documentBtn.dataset.id = application.id;
    documentBtn.title = 'Manage Documents';
    documentBtn.innerHTML = '📎';
    documentBtn.onclick = (e) => {
        e.stopPropagation();
        showDocumentsModal(application.id);
    };
    
    // Insert after contact button if it exists, otherwise after interview button
    const contactBtn = cardActions.querySelector('.contact-btn');
    if (contactBtn) {
        contactBtn.after(documentBtn);
    } else {
        const interviewBtn = cardActions.querySelector('.interview-btn');
        if (interviewBtn) {
            interviewBtn.after(documentBtn);
        } else {
            const editBtn = cardActions.querySelector('.edit-btn');
            cardActions.insertBefore(documentBtn, editBtn);
        }
    }
}

// Helper function to enhance dashboard statistics with document data
function enhanceDashboardWithDocuments(stats, applications) {
    // Calculate document statistics
    let totalDocuments = 0;
    let resumesSent = 0;
    let coverLettersSent = 0;
    
    applications.forEach(app => {
        if (app.documents && app.documents.length > 0) {
            app.documents.forEach(doc => {
                totalDocuments++;
                if (doc.type === 'resume') resumesSent++;
                if (doc.type === 'cover-letter') coverLettersSent++;
            });
        }
    });
    
    // Add to stats object
    stats.totalDocuments = totalDocuments;
    stats.resumesSent = resumesSent;
    stats.coverLettersSent = coverLettersSent;
    
    return stats;
}

console.log('✅ Step 24: Document tracking functionality added successfully!');

// ===== END OF DOCUMENT TRACKING FUNCTIONALITY =====
// ===== STEP 25: DATA EXPORT FUNCTIONALITY =====
// Add this code to your script.js file after the document tracking section

// Export functionality
async function exportData(format = 'json', options = {}) {
    try {
        // Default options
        const exportOptions = {
            includeInterviews: true,
            includeContacts: true,
            includeDocuments: true,
            includeNotes: true,
            ...options
        };
        
        // Fetch all applications
        const applications = await getAllApplicationsFromDB();
        
        if (applications.length === 0) {
            notifyWarning('No applications to export');
            return null;
        }
        
        // Prepare data based on options
        const exportData = applications.map(app => {
            const cleanApp = {
                id: app.id,
                jobTitle: app.jobTitle,
                companyName: app.companyName,
                applicationDate: app.applicationDate,
                status: app.status,
                deadline: app.deadline,
                url: app.url,
                salary: app.salary,
                location: app.location,
                progressStage: app.progressStage,
                createdAt: app.createdAt,
                updatedAt: app.updatedAt
            };
            
            if (exportOptions.includeNotes && app.notes) {
                cleanApp.notes = app.notes;
            }
            
            if (exportOptions.includeInterviews && app.interviewDates) {
                cleanApp.interviews = app.interviewDates;
            }
            
            if (exportOptions.includeContacts && app.contacts) {
                cleanApp.contacts = app.contacts;
            }
            
            if (exportOptions.includeDocuments && app.documents) {
                cleanApp.documents = app.documents;
            }
            
            return cleanApp;
        });
        
        let fileContent, fileName, mimeType;
        
        if (format === 'json') {
            // Export as JSON
            fileContent = JSON.stringify({
                exportDate: new Date().toISOString(),
                applicationCount: exportData.length,
                applications: exportData
            }, null, 2);
            fileName = `job-applications-${formatDate(new Date())}.json`;
            mimeType = 'application/json';
            
        } else if (format === 'csv') {
            // Export as CSV
            fileContent = convertToCSV(exportData, exportOptions);
            fileName = `job-applications-${formatDate(new Date())}.csv`;
            mimeType = 'text/csv';
        }
        
        // Create and download file
        downloadFile(fileContent, fileName, mimeType);
        
        // Return statistics
        return {
            format: format,
            applicationCount: exportData.length,
            fileSize: new Blob([fileContent]).size,
            fileName: fileName
        };
        
    } catch (error) {
        console.error('Error exporting data:', error);
        notifyError('Failed to export data');
        throw error;
    }
}

// Convert data to CSV format
function convertToCSV(data, options) {
    if (data.length === 0) return '';
    
    // Define CSV headers based on options
    const headers = [
        'ID',
        'Job Title',
        'Company',
        'Application Date',
        'Status',
        'Progress Stage',
        'Deadline',
        'URL',
        'Salary',
        'Location'
    ];
    
    if (options.includeNotes) {
        headers.push('Notes');
    }
    
    if (options.includeInterviews) {
        headers.push('Interview Count', 'Next Interview');
    }
    
    if (options.includeContacts) {
        headers.push('Contact Count', 'Primary Contact');
    }
    
    if (options.includeDocuments) {
        headers.push('Documents Count', 'Document Types');
    }
    
    headers.push('Created Date', 'Updated Date');
    
    // Create CSV rows
    const rows = data.map(app => {
        const row = [
            app.id,
            escapeCSV(app.jobTitle),
            escapeCSV(app.companyName),
            app.applicationDate,
            app.status,
            app.progressStage,
            app.deadline || '',
            app.url || '',
            escapeCSV(app.salary || ''),
            escapeCSV(app.location || '')
        ];
        
        if (options.includeNotes) {
            row.push(escapeCSV(app.notes || ''));
        }
        
        if (options.includeInterviews) {
            const interviews = app.interviews || [];
            const upcomingInterviews = interviews.filter(i => 
                i.status === 'scheduled' && 
                new Date(`${i.date} ${i.time}`) >= new Date()
            ).sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
            
            row.push(interviews.length);
            row.push(upcomingInterviews.length > 0 ? 
                `${upcomingInterviews[0].date} ${upcomingInterviews[0].time}` : '');
        }
        
        if (options.includeContacts) {
            const contacts = app.contacts || [];
            const primaryContact = contacts.find(c => c.isPrimary);
            
            row.push(contacts.length);
            row.push(primaryContact ? escapeCSV(primaryContact.name) : '');
        }
        
        if (options.includeDocuments) {
            const documents = app.documents || [];
            const documentTypes = [...new Set(documents.map(d => d.type))].join('; ');
            
            row.push(documents.length);
            row.push(escapeCSV(documentTypes));
        }
        
        row.push(app.createdAt || '');
        row.push(app.updatedAt || '');
        
        return row;
    });
    
    // Combine headers and rows
    return [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
}

// Escape CSV values
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    
    // If value contains comma, quotes, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
}

// Format date for filename
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Download file
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Show export modal
function showExportModal() {
    const modalContent = `
        <div class="export-modal-content">
            <div class="export-stats" id="exportStats">
                <!-- Stats will be populated here -->
            </div>
            
            <div class="export-form" id="exportForm">
                <h4>Choose Export Format:</h4>
                
                <div class="export-options">
                    <div class="export-option selected" data-format="json">
                        <div class="export-option-header">
                            <span class="export-option-icon">📄</span>
                            <h5 class="export-option-title">JSON Format</h5>
                        </div>
                        <p class="export-option-description">
                            Complete data backup including all details, perfect for importing later
                        </p>
                    </div>
                    
                    <div class="export-option" data-format="csv">
                        <div class="export-option-header">
                            <span class="export-option-icon">📊</span>
                            <h5 class="export-option-title">CSV Format</h5>
                        </div>
                        <p class="export-option-description">
                            Spreadsheet format for Excel, Google Sheets, or data analysis
                        </p>
                    </div>
                </div>
                
                <div class="export-settings">
                    <h4>Include in Export:</h4>
                    <div class="export-checkboxes">
                        <div class="export-checkbox">
                            <input type="checkbox" id="includeInterviews" checked>
                            <label for="includeInterviews">Interview Information</label>
                        </div>
                        <div class="export-checkbox">
                            <input type="checkbox" id="includeContacts" checked>
                            <label for="includeContacts">Contact Details</label>
                        </div>
                        <div class="export-checkbox">
                            <input type="checkbox" id="includeDocuments" checked>
                            <label for="includeDocuments">Document Records</label>
                        </div>
                        <div class="export-checkbox">
                            <input type="checkbox" id="includeNotes" checked>
                            <label for="includeNotes">Application Notes</label>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                    <button type="button" class="btn btn-primary" id="exportButton">
                        Export Data
                    </button>
                </div>
            </div>
            
            <div class="export-progress" id="exportProgress">
                <div class="export-progress-spinner"></div>
                <p class="export-progress-text">Preparing your export...</p>
            </div>
            
            <div class="export-success" id="exportSuccess">
                <div class="export-success-icon">✅</div>
                <h3 class="export-success-text">Export Successful!</h3>
                <p class="export-success-details" id="exportDetails"></p>
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" onclick="hideModal()">Done</button>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalContent, {
        title: 'Export Application Data',
        size: 'medium',
        closeOnBackdrop: true,
        onOpen: async (modalElement) => {
            // Load statistics
            await loadExportStats();
            
            // Setup format selection
            const formatOptions = modalElement.querySelectorAll('.export-option');
            formatOptions.forEach(option => {
                option.addEventListener('click', () => {
                    formatOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });
            
            // Setup export button
            const exportButton = modalElement.querySelector('#exportButton');
            exportButton.addEventListener('click', async () => {
                await handleExport();
            });
        }
    });
}

// Load export statistics
async function loadExportStats() {
    try {
        const applications = await getAllApplicationsFromDB();
        const stats = await calculateDashboardStats();
        
        const statsContainer = document.getElementById('exportStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="export-stat">
                    <p class="export-stat-value">${applications.length}</p>
                    <p class="export-stat-label">Applications</p>
                </div>
                <div class="export-stat">
                    <p class="export-stat-value">${stats.totalInterviews || 0}</p>
                    <p class="export-stat-label">Interviews</p>
                </div>
                <div class="export-stat">
                    <p class="export-stat-value">${stats.totalContacts || 0}</p>
                    <p class="export-stat-label">Contacts</p>
                </div>
                <div class="export-stat">
                    <p class="export-stat-value">${stats.totalDocuments || 0}</p>
                    <p class="export-stat-label">Documents</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading export stats:', error);
    }
}

// Handle export process
async function handleExport() {
    const selectedFormat = document.querySelector('.export-option.selected').dataset.format;
    const options = {
        includeInterviews: document.getElementById('includeInterviews').checked,
        includeContacts: document.getElementById('includeContacts').checked,
        includeDocuments: document.getElementById('includeDocuments').checked,
        includeNotes: document.getElementById('includeNotes').checked
    };
    
    // Show progress
    document.getElementById('exportForm').style.display = 'none';
    document.getElementById('exportProgress').classList.add('active');
    
    try {
        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Export data
        const result = await exportData(selectedFormat, options);
        
        if (result) {
            // Show success
            document.getElementById('exportProgress').classList.remove('active');
            document.getElementById('exportSuccess').classList.add('active');
            
            const fileSizeKB = (result.fileSize / 1024).toFixed(1);
            document.getElementById('exportDetails').textContent = 
                `Exported ${result.applicationCount} applications to ${result.fileName} (${fileSizeKB} KB)`;
            
            notifySuccess(`Data exported successfully to ${result.fileName}`);
        }
    } catch (error) {
        console.error('Export error:', error);
        hideModal();
        notifyError('Failed to export data. Please try again.');
    }
}
console.log('✅ Step 25: Data export functionality added successfully!');

// ===== END OF DATA EXPORT FUNCTIONALITY =====
// ===== STEP 26: DATA IMPORT FUNCTIONALITY =====
// Add this code to your script.js file after the export functionality section

// Import functionality
async function importData(fileContent, fileType, importMode = 'merge') {
    try {
        let applications = [];
        
        if (fileType === 'json') {
            applications = parseJSONImport(fileContent);
        } else if (fileType === 'csv') {
            applications = parseCSVImport(fileContent);
        } else {
            throw new Error('Unsupported file type');
        }
        
        if (!applications || applications.length === 0) {
            throw new Error('No valid applications found in file');
        }
        
        // Get existing applications
        const existingApplications = await getAllApplicationsFromDB();
        
        // Create a map for duplicate detection based on job title + company + date
        const existingMap = new Map();
        existingApplications.forEach(app => {
            const key = createApplicationKey(app);
            existingMap.set(key, app);
        });
        
        let imported = 0;
        let skipped = 0;
        let updated = 0;
        const errors = [];
        
        // Process each application
        for (const app of applications) {
            try {
                // Validate required fields
                if (!app.jobTitle || !app.companyName || !app.applicationDate || !app.status) {
                    errors.push(`Missing required fields for ${app.jobTitle || 'Unknown'} at ${app.companyName || 'Unknown'}`);
                    skipped++;
                    continue;
                }
                
                // Create key for duplicate detection
                const appKey = createApplicationKey(app);
                const existingApp = existingMap.get(appKey);
                const exists = !!existingApp;
                
                if (importMode === 'merge') {
                    if (exists) {
                        // Update existing application - preserve the original ID
                        app.id = existingApp.id;
                        await updateApplicationInDB(app);
                        updated++;
                    } else {
                        // Add new application
                        await addApplicationToDB(app);
                        imported++;
                    }
                } else if (importMode === 'new') {
                    if (!exists) {
                        // Only add if it doesn't exist
                        await addApplicationToDB(app);
                        imported++;
                    } else {
                        console.log(`Skipping duplicate: ${app.jobTitle} at ${app.companyName} on ${app.applicationDate}`);
                        skipped++;
                    }
                } else if (importMode === 'replace') {
                    // Clear all existing data first (only once)
                    if (imported === 0 && updated === 0) {
                        await clearAllApplications();
                    }
                    // Add all applications
                    await addApplicationToDB(app);
                    imported++;
                }
                
            } catch (error) {
                console.error('Error importing application:', error);
                errors.push(`Failed to import ${app.jobTitle} at ${app.companyName}: ${error.message}`);
                skipped++;
            }
        }
        
        return {
            success: true,
            imported,
            updated,
            skipped,
            total: applications.length,
            errors
        };
        
    } catch (error) {
        console.error('Error importing data:', error);
        return {
            success: false,
            error: error.message,
            imported: 0,
            updated: 0,
            skipped: 0,
            total: 0,
            errors: [error.message]
        };
    }
}

// Helper function to create a unique key for duplicate detection
function createApplicationKey(app) {
    // Create a key based on job title, company, and application date
    // This helps identify the same application even if IDs differ
    const jobTitle = (app.jobTitle || '').toLowerCase().trim();
    const company = (app.companyName || '').toLowerCase().trim();
    const date = app.applicationDate || '';
    
    return `${jobTitle}|${company}|${date}`;
}

// Parse JSON import file
function parseJSONImport(fileContent) {
    try {
        const data = JSON.parse(fileContent);
        
        // Handle both direct array and wrapped format
        let applications = data;
        if (data.applications && Array.isArray(data.applications)) {
            applications = data.applications;
        }
        
        if (!Array.isArray(applications)) {
            throw new Error('Invalid JSON format: expected array of applications');
        }
        
        // Process and validate each application
        return applications.map(app => ({
            id: app.id || generateId(),
            jobTitle: app.jobTitle,
            companyName: app.companyName,
            applicationDate: app.applicationDate,
            status: app.status,
            deadline: app.deadline || null,
            url: app.url || '',
            salary: app.salary || '',
            location: app.location || '',
            progressStage: app.progressStage || 'to-apply',
            notes: app.notes || '',
            interviewDates: app.interviews || app.interviewDates || [],
            contacts: app.contacts || [],
            documents: app.documents || [],
            createdAt: app.createdAt || new Date().toISOString(),
            updatedAt: app.updatedAt || new Date().toISOString()
        }));
        
    } catch (error) {
        console.error('JSON parsing error:', error);
        throw new Error('Invalid JSON file format');
    }
}

// Parse CSV import file
function parseCSVImport(fileContent) {
    try {
        const lines = fileContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data');
        }
        
        // Parse headers
        const headers = parseCSVLine(lines[0]);
        const applications = [];
        
        // Process each data row
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0) continue;
            
            // Map CSV columns to application object
            const app = {
                id: generateId(), // Generate new ID for CSV imports
                jobTitle: getValue(headers, values, ['Job Title', 'jobTitle', 'Title']),
                companyName: getValue(headers, values, ['Company', 'companyName', 'Company Name']),
                applicationDate: getValue(headers, values, ['Application Date', 'applicationDate', 'Date Applied']),
                status: getValue(headers, values, ['Status', 'status']),
                deadline: getValue(headers, values, ['Deadline', 'deadline']) || null,
                url: getValue(headers, values, ['URL', 'url', 'Link']) || '',
                salary: getValue(headers, values, ['Salary', 'salary', 'Salary Range']) || '',
                location: getValue(headers, values, ['Location', 'location']) || '',
                progressStage: getValue(headers, values, ['Progress Stage', 'progressStage']) || 'to-apply',
                notes: getValue(headers, values, ['Notes', 'notes']) || '',
                interviewDates: [], // CSV doesn't include nested data
                contacts: [],
                documents: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            applications.push(app);
        }
        
        return applications;
        
    } catch (error) {
        console.error('CSV parsing error:', error);
        throw new Error('Invalid CSV file format');
    }
}

// Parse a single CSV line handling quotes and commas
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"' && inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
        } else if (char === '"') {
            // Toggle quote state
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            // End of field
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add last field
    values.push(current.trim());
    
    return values;
}

// Get value from CSV row by header name
function getValue(headers, values, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        if (index !== -1 && values[index]) {
            return values[index];
        }
    }
    return '';
}

// Clear all applications from database
async function clearAllApplications() {
    const applications = await getAllApplicationsFromDB();
    for (const app of applications) {
        await deleteApplicationFromDB(app.id);
    }
}

// Show import modal
function showImportModal() {
    const modalContent = `
        <div class="import-modal-content">
            <div class="file-drop-zone" id="dropZone">
                <input type="file" id="fileInput" class="file-input" accept=".json,.csv">
                <div class="file-drop-zone-icon">📤</div>
                <p class="file-drop-zone-text">Drop your file here or click to browse</p>
                <p class="file-drop-zone-subtext">Supports JSON and CSV files exported from this app</p>
            </div>
            
            <div class="file-selected" id="fileSelected">
                <div class="file-info">
                    <span class="file-icon" id="fileIcon">📄</span>
                    <div class="file-details">
                        <h4 id="fileName">No file selected</h4>
                        <p id="fileDetails">Select a file to import</p>
                    </div>
                </div>
            </div>
            
            <div class="import-preview" id="importPreview">
                <h4>Import Preview</h4>
                <div class="import-summary" id="importSummary">
                    <!-- Summary will be populated here -->
                </div>
            </div>
            
            <div class="import-options">
                <h4>Import Mode:</h4>
                <div class="import-option">
                    <input type="radio" id="importMerge" name="importMode" value="merge" checked>
                    <label for="importMerge">Merge with existing data</label>
                </div>
                <p class="import-option-description">Update existing applications and add new ones</p>
                
                <div class="import-option">
                    <input type="radio" id="importNew" name="importMode" value="new">
                    <label for="importNew">Import only new applications</label>
                </div>
                <p class="import-option-description">Skip applications that already exist</p>
                
                <div class="import-option">
                    <input type="radio" id="importReplace" name="importMode" value="replace">
                    <label for="importReplace">Replace all data</label>
                </div>
                <p class="import-option-description">⚠️ Delete all existing data and import fresh</p>
            </div>
            
            <div class="import-progress" id="importProgress">
                <p class="import-progress-text">Importing applications...</p>
                <div class="import-progress-bar">
                    <div class="import-progress-fill" id="progressFill"></div>
                </div>
                <p class="import-progress-details" id="progressDetails">Processing...</p>
            </div>
            
            <div class="import-results" id="importResults">
                <div class="import-results-icon" id="resultsIcon"></div>
                <p class="import-results-text" id="resultsText"></p>
                <p class="import-results-details" id="resultsDetails"></p>
                <div class="import-errors" id="importErrors" style="display: none;">
                    <!-- Errors will be listed here -->
                </div>
            </div>
            
            <div class="modal-actions" id="importActions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="button" class="btn btn-primary" id="importButton" disabled>
                    Import Data
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent, {
        title: 'Import Application Data',
        size: 'medium',
        closeOnBackdrop: false,
        onOpen: (modalElement) => {
            setupImportModal();
        }
    });
}

// Setup import modal functionality
function setupImportModal() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const importButton = document.getElementById('importButton');
    
    let selectedFile = null;
    let fileContent = null;
    let fileType = null;
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });
    
    // Drop zone click
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });
    
    // Handle file selection
    async function handleFileSelect(file) {
        selectedFile = file;
        
        // Validate file type
        const extension = file.name.split('.').pop().toLowerCase();
        if (extension !== 'json' && extension !== 'csv') {
            notifyError('Please select a JSON or CSV file');
            return;
        }
        
        fileType = extension;
        
        // Update UI
        document.getElementById('fileSelected').classList.add('active');
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileDetails').textContent = `${fileType.toUpperCase()} • ${formatFileSize(file.size)}`;
        document.getElementById('fileIcon').textContent = fileType === 'json' ? '📄' : '📊';
        
        // Read file content
        try {
            fileContent = await readFile(file);
            
            // Preview import
            const preview = await previewImport(fileContent, fileType);
            displayImportPreview(preview);
            
            // Enable import button
            importButton.disabled = false;
            
        } catch (error) {
            console.error('Error reading file:', error);
            notifyError('Failed to read file. Please check the file format.');
            importButton.disabled = true;
        }
    }
    
    // Import button click
    importButton.addEventListener('click', async () => {
        if (!fileContent || !fileType) return;
        
        const importMode = document.querySelector('input[name="importMode"]:checked').value;
        
        // Confirm replace mode
        if (importMode === 'replace') {
            const confirmed = await new Promise(resolve => {
                showConfirmModal(
                    'Are you sure you want to replace all existing data? This action cannot be undone.',
                    {
                        title: 'Confirm Data Replacement',
                        confirmText: 'Replace All Data',
                        confirmClass: 'btn btn-danger',
                        onConfirm: () => resolve(true),
                        onCancel: () => resolve(false)
                    }
                );
            });
            
            if (!confirmed) return;
        }
        
        // Hide form and show progress
        document.querySelector('.import-modal-content > :not(.import-progress):not(.import-results)').style.display = 'none';
        document.getElementById('importActions').style.display = 'none';
        document.getElementById('importProgress').classList.add('active');
        
        // Perform import
        try {
            const result = await importData(fileContent, fileType, importMode);
            
            // Show results
            document.getElementById('importProgress').classList.remove('active');
            displayImportResults(result);
            
        } catch (error) {
            console.error('Import error:', error);
            document.getElementById('importProgress').classList.remove('active');
            displayImportResults({
                success: false,
                error: error.message,
                imported: 0,
                updated: 0,
                skipped: 0,
                errors: [error.message]
            });
        }
    });
}

// Read file content
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Preview import data
async function previewImport(fileContent, fileType) {
    try {
        let applications = [];
        
        if (fileType === 'json') {
            applications = parseJSONImport(fileContent);
        } else if (fileType === 'csv') {
            applications = parseCSVImport(fileContent);
        }
        
        // Count various data types
        let interviewCount = 0;
        let contactCount = 0;
        let documentCount = 0;
        
        applications.forEach(app => {
            if (app.interviewDates) interviewCount += app.interviewDates.length;
            if (app.contacts) contactCount += app.contacts.length;
            if (app.documents) documentCount += app.documents.length;
        });
        
        return {
            applications: applications.length,
            interviews: interviewCount,
            contacts: contactCount,
            documents: documentCount
        };
        
    } catch (error) {
        console.error('Preview error:', error);
        return {
            applications: 0,
            interviews: 0,
            contacts: 0,
            documents: 0
        };
    }
}

// Display import preview
function displayImportPreview(preview) {
    const previewElement = document.getElementById('importPreview');
    const summaryElement = document.getElementById('importSummary');
    
    previewElement.classList.add('active');
    
    summaryElement.innerHTML = `
        <div class="import-summary-item">
            <p class="import-summary-value">${preview.applications}</p>
            <p class="import-summary-label">Applications</p>
        </div>
        <div class="import-summary-item">
            <p class="import-summary-value">${preview.interviews}</p>
            <p class="import-summary-label">Interviews</p>
        </div>
        <div class="import-summary-item">
            <p class="import-summary-value">${preview.contacts}</p>
            <p class="import-summary-label">Contacts</p>
        </div>
        <div class="import-summary-item">
            <p class="import-summary-value">${preview.documents}</p>
            <p class="import-summary-label">Documents</p>
        </div>
    `;
}

// Also update the displayImportResults function to show better feedback:
function displayImportResults(result) {
    const resultsElement = document.getElementById('importResults');
    const iconElement = document.getElementById('resultsIcon');
    const textElement = document.getElementById('resultsText');
    const detailsElement = document.getElementById('resultsDetails');
    const errorsElement = document.getElementById('importErrors');
    const actionsElement = document.getElementById('importActions');
    
    resultsElement.classList.add('active');
    
    if (result.success) {
        resultsElement.classList.add('success');
        iconElement.textContent = '✅';
        textElement.textContent = 'Import Completed Successfully!';
        
        const details = [];
        if (result.imported > 0) details.push(`${result.imported} new applications imported`);
        if (result.updated > 0) details.push(`${result.updated} applications updated`);
        if (result.skipped > 0) details.push(`${result.skipped} applications skipped (duplicates or errors)`);
        
        detailsElement.textContent = details.join(', ');
        
        // Show notification
        if (result.imported > 0 || result.updated > 0) {
            notifySuccess(`Import completed: ${result.imported} added, ${result.updated} updated, ${result.skipped} skipped`);
        } else if (result.skipped > 0) {
            notifyWarning(`All ${result.skipped} applications were skipped as duplicates`);
        }
        
        if (result.errors && result.errors.length > 0) {
            errorsElement.style.display = 'block';
            errorsElement.innerHTML = '<h5>Import Warnings:</h5>' + 
                result.errors.map(err => `<div class="import-error-item">${err}</div>`).join('');
        }
        
        // Refresh the current view
        setTimeout(() => {
            const activeView = document.querySelector('.view.active');
            if (activeView && activeView.id === 'listView') {
                renderApplicationsList();
            } else if (activeView && activeView.id === 'kanbanView') {
                renderKanbanBoard();
            } else if (activeView && activeView.id === 'dashboardView') {
                renderDashboard();
            }
        }, 100);
        
    } else {
        resultsElement.classList.add('error');
        iconElement.textContent = '❌';
        textElement.textContent = 'Import Failed';
        detailsElement.textContent = result.error || 'An error occurred during import';
        
        if (result.errors && result.errors.length > 0) {
            errorsElement.style.display = 'block';
            errorsElement.innerHTML = '<h5>Errors:</h5>' + 
                result.errors.map(err => `<div class="import-error-item">${err}</div>`).join('');
        }
    }
    
    // Show done button
    actionsElement.style.display = 'flex';
    actionsElement.innerHTML = '<button type="button" class="btn btn-primary" onclick="hideModal()">Done</button>';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

console.log('✅ Step 26: Data import functionality added successfully!');

// ===== END OF DATA IMPORT FUNCTIONALITY =====
