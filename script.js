console.log('Script.js is loading!');

// IndexedDB Configuration
const DB_NAME = 'JobApplicationTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'applications';

let db = null;

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

// Apply sorting to applications array
function applySorting(applications) {
    const sorted = [...applications]; // Create a copy
    const { sortBy, sortDirection } = searchFilterState;
    
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
        return sortDirection === 'asc' ? compareValue : -compareValue;
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

// Render the applications list
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

// Handle action button clicks - FIXED VERSION
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
        return; // Important: return early to prevent further processing
    }
    
    // Handle delete button click
    if (deleteBtn) {
        e.stopPropagation();
        
        // Prevent double-clicks
        if (deleteBtn.disabled) {
            return;
        }
        
        const applicationId = deleteBtn.dataset.id;
        const applicationCard = deleteBtn.closest('.application-card') || deleteBtn.closest('.kanban-card');
        
        if (!applicationCard) {
            console.error('Card not found');
            return;
        }
        
        // Get job title and company name based on card type
        let jobTitle, companyName;
        
        if (applicationCard.classList.contains('application-card')) {
            // List view card
            jobTitle = applicationCard.querySelector('.job-title')?.textContent || 'Unknown';
            companyName = applicationCard.querySelector('.company-info strong')?.textContent || 'Unknown';
        } else {
            // Kanban card
            jobTitle = applicationCard.querySelector('.kanban-card-title')?.textContent || 'Unknown';
            companyName = applicationCard.querySelector('.kanban-card-company')?.textContent || 'Unknown';
        }
        
        // Disable button to prevent double-clicks
        deleteBtn.disabled = true;
        const originalContent = deleteBtn.innerHTML;
        
        // Show confirmation modal
        showConfirmModal(`Are you sure you want to delete the application for "${jobTitle}" at ${companyName}?`, {
            title: 'Delete Application',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmClass: 'btn btn-danger',
            cancelClass: 'btn btn-secondary',
            onConfirm: async () => {
                try {
                    deleteBtn.innerHTML = '⏳';
                    
                    await deleteApplicationFromDB(applicationId);
                    
                    // Animate card removal
                    applicationCard.style.transition = 'all 0.3s ease';
                    applicationCard.style.opacity = '0';
                    applicationCard.style.transform = 'translateX(-100%)';
                    
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
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = originalContent;
                    notifyError('Failed to delete application. Please try again.');
                }
            },
            onCancel: () => {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalContent;
            },
            onClose: () => {
                // Ensure button is re-enabled even if modal is closed by escape or backdrop
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalContent;
            }
        });
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
        button.addEventListener('click', (e) => {
            const sortBy = button.dataset.sort;
            let sortDirection = button.dataset.direction;
            
            // If clicking the already active button, toggle direction
            if (button.classList.contains('active')) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                button.dataset.direction = sortDirection;
                
                // Update arrow
                const arrow = button.querySelector('.sort-arrow');
                if (arrow) {
                    arrow.textContent = sortDirection === 'asc' ? '↑' : '↓';
                }
            } else {
                // Remove active class from all buttons
                sortButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
            }
            
            // Update state
            searchFilterState.sortBy = sortBy;
            searchFilterState.sortDirection = sortDirection;
            
            console.log('Sort by:', sortBy, 'Direction:', sortDirection);
            filterSortAndRender();
        });
    });
    
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

// Dashboard Statistics Calculation
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
        
        return stats;
        
    } catch (error) {
        console.error('Error calculating dashboard stats:', error);
        return null;
    }
}

// Update renderDashboard to include charts
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
    
    // Render statistics cards (same as before)
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
                notifySuccess(`Moved "${application.jobTitle}" to ${newStatus}`);
                
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
};

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
// Generic modal handling for the application

// Modal state management
let activeModal = null;
let modalStack = [];

// Show modal with dynamic content - FIXED VERSION
function showModal(content, options = {}) {
    const modalContainer = document.getElementById('modalContainer');
    
    if (!modalContainer) {
        console.error('Modal container not found');
        return;
    }
    
    // If modal is already visible, don't open another
    if (modalContainer.classList.contains('active')) {
        console.warn('Modal is already active, preventing double open');
        return;
    }
    
    const modal = modalContainer.querySelector('.modal');
    const modalContent = modal.querySelector('.modal-content') || modal;
    
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    
    // Default options
    const settings = {
        title: '',
        size: 'medium',
        closeOnBackdrop: true,
        closeOnEscape: true,
        onClose: null,
        onOpen: null,
        ...options
    };
    
    // Set modal content
    if (settings.title) {
        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${settings.title}</h3>
                <button class="modal-close" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;
    } else {
        modalContent.innerHTML = content;
    }
    
    // Apply size class
    modal.className = `modal modal-${settings.size}`;
    
    // Store modal reference and settings
    activeModal = {
        container: modalContainer,
        settings: settings
    };
    
    // Push to modal stack for nested modals support
    modalStack.push(activeModal);
    
    // Show modal with animation
    modalContainer.style.display = 'flex';
    requestAnimationFrame(() => {
        modalContainer.classList.add('active');
        modal.classList.add('modal-enter');
        
        setTimeout(() => {
            modal.classList.remove('modal-enter');
        }, 300);
    });
    
    // Setup close listeners
    setupModalCloseListeners(modalContainer, settings);
    
    // Focus management
    setTimeout(() => {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }, 100);
    
    // Call onOpen callback if provided
    if (settings.onOpen && typeof settings.onOpen === 'function') {
        settings.onOpen(modal);
    }
    
    // Trap focus within modal
    trapFocus(modal);
    
    return modal;
}

// Hide the currently active modal - FIXED VERSION
function hideModal(modalContainer = null) {
    if (!modalContainer && activeModal) {
        modalContainer = activeModal.container;
    }
    
    if (!modalContainer || !modalContainer.classList.contains('active')) {
        console.log('No active modal to hide');
        return;
    }
    
    const modal = modalContainer.querySelector('.modal');
    const settings = activeModal ? activeModal.settings : {};
    
    // Remove event listeners
    if (modalContainer._backdropHandler) {
        modalContainer.removeEventListener('click', modalContainer._backdropHandler);
        modalContainer._backdropHandler = null;
    }
    
    if (settings._escapeHandler) {
        document.removeEventListener('keydown', settings._escapeHandler);
        settings._escapeHandler = null;
    }
    
    // Add exit animation
    modal.classList.add('modal-exit');
    modalContainer.classList.remove('active');
    
    // Call onClose callback if provided
    if (settings.onClose && typeof settings.onClose === 'function') {
        settings.onClose(modal);
    }
    
    // Hide after animation completes
    setTimeout(() => {
        modalContainer.style.display = 'none';
        modal.classList.remove('modal-exit');
        
        // Clear modal content
        const modalContent = modal.querySelector('.modal-content') || modal;
        modalContent.innerHTML = '';
        
        // Remove from modal stack
        modalStack.pop();
        
        // Update active modal reference
        activeModal = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
        
        // Restore focus to the element that triggered the modal
        if (settings.triggerElement) {
            settings.triggerElement.focus();
        }
    }, 300);
}

// Setup modal close event listeners - FIXED VERSION
function setupModalCloseListeners(modalContainer, settings) {
    // Close button click - use addEventListener instead of onclick
    const closeBtn = modalContainer.querySelector('.modal-close');
    if (closeBtn) {
        // Remove any existing listener first
        if (closeBtn._closeHandler) {
            closeBtn.removeEventListener('click', closeBtn._closeHandler);
        }
        
        closeBtn._closeHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideModal(modalContainer);
        };
        
        closeBtn.addEventListener('click', closeBtn._closeHandler);
    }
    
    // Backdrop click - remove old handler first
    if (modalContainer._backdropHandler) {
        modalContainer.removeEventListener('click', modalContainer._backdropHandler);
    }
    
    if (settings.closeOnBackdrop) {
        modalContainer._backdropHandler = (e) => {
            if (e.target === modalContainer) {
                e.stopPropagation();
                hideModal(modalContainer);
            }
        };
        modalContainer.addEventListener('click', modalContainer._backdropHandler);
    }
    
    // Escape key press - remove old handler first
    if (settings._escapeHandler) {
        document.removeEventListener('keydown', settings._escapeHandler);
    }
    
    if (settings.closeOnEscape) {
        settings._escapeHandler = (e) => {
            if (e.key === 'Escape' && activeModal && activeModal.container === modalContainer) {
                e.preventDefault();
                hideModal(modalContainer);
            }
        };
        document.addEventListener('keydown', settings._escapeHandler);
    }
}

// Trap focus within modal for accessibility
function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    const trapHandler = (e) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    };
    
    modal.addEventListener('keydown', trapHandler);
    
    // Store handler for cleanup
    modal._trapHandler = trapHandler;
}

// Utility function to create a confirmation modal - FIXED VERSION
function showConfirmModal(message, options = {}) {
    const settings = {
        title: 'Confirm',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        confirmClass: 'btn btn-primary',
        cancelClass: 'btn btn-secondary',
        onConfirm: null,
        onCancel: null,
        onClose: null,
        closeOnBackdrop: true,
        closeOnEscape: true,
        ...options
    };
    
    const content = `
        <div class="modal-message">
            <p>${message}</p>
        </div>
        <div class="modal-actions">
            <button type="button" class="${settings.cancelClass}" id="modalCancelBtn">
                ${settings.cancelText}
            </button>
            <button type="button" class="${settings.confirmClass}" id="modalConfirmBtn">
                ${settings.confirmText}
            </button>
        </div>
    `;
    
    const modal = showModal(content, {
        title: settings.title,
        size: 'small',
        closeOnBackdrop: settings.closeOnBackdrop,
        closeOnEscape: settings.closeOnEscape,
        onClose: settings.onClose,
        onOpen: (modal) => {
            // Setup button handlers
            const confirmBtn = modal.querySelector('#modalConfirmBtn');
            const cancelBtn = modal.querySelector('#modalCancelBtn');
            
            // Ensure we remove any existing event listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            // Add click handlers
            newConfirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                hideModal();
                if (settings.onConfirm) {
                    settings.onConfirm();
                }
            });
            
            newCancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                hideModal();
                if (settings.onCancel) {
                    settings.onCancel();
                }
            });
            
            // Focus the cancel button by default (safer option)
            newCancelBtn.focus();
        }
    });
    
    return modal;
}

// Utility function to create an alert modal
function showAlertModal(message, options = {}) {
    const settings = {
        title: 'Alert',
        okText: 'OK',
        okClass: 'btn-primary',
        onOk: null,
        ...options
    };
    
    const content = `
        <div class="modal-message">
            <p>${message}</p>
        </div>
        <div class="modal-actions">
            <button class="btn ${settings.okClass}" id="modalOkBtn">
                ${settings.okText}
            </button>
        </div>
    `;
    
    const modal = showModal(content, {
        title: settings.title,
        size: 'small',
        closeOnBackdrop: true,
        closeOnEscape: true,
        onOpen: (modal) => {
            const okBtn = modal.querySelector('#modalOkBtn');
            okBtn.onclick = () => {
                hideModal();
                if (settings.onOk) settings.onOk();
            };
            
            // Auto-focus OK button
            okBtn.focus();
        }
    });
    
    return modal;
}

// Utility function to create a form modal
function showFormModal(formHtml, options = {}) {
    const settings = {
        title: 'Form',
        submitText: 'Submit',
        cancelText: 'Cancel',
        submitClass: 'btn-primary',
        cancelClass: 'btn-secondary',
        onSubmit: null,
        onCancel: null,
        validateForm: null,
        ...options
    };
    
    const content = `
        <form id="modalForm" class="modal-form">
            ${formHtml}
            <div class="modal-actions">
                <button type="button" class="btn ${settings.cancelClass}" id="modalFormCancelBtn">
                    ${settings.cancelText}
                </button>
                <button type="submit" class="btn ${settings.submitClass}" id="modalFormSubmitBtn">
                    ${settings.submitText}
                </button>
            </div>
        </form>
    `;
    
    const modal = showModal(content, {
        title: settings.title,
        size: settings.size || 'medium',
        closeOnBackdrop: false,
        closeOnEscape: true,
        onOpen: (modal) => {
            const form = modal.querySelector('#modalForm');
            const cancelBtn = modal.querySelector('#modalFormCancelBtn');
            
            // Handle form submission
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                // Run validation if provided
                if (settings.validateForm) {
                    const isValid = settings.validateForm(form);
                    if (!isValid) return;
                }
                
                // Get form data
                const formData = new FormData(form);
                
                // Call onSubmit callback
                if (settings.onSubmit) {
                    try {
                        await settings.onSubmit(formData, form);
                        hideModal();
                    } catch (error) {
                        console.error('Form submission error:', error);
                        // Keep modal open on error
                    }
                }
            };
            
            // Handle cancel
            cancelBtn.onclick = () => {
                hideModal();
                if (settings.onCancel) settings.onCancel();
            };
        }
    });
    
    return modal;
}

// Initialize modal system when DOM is ready
function initializeModalSystem() {
    // Ensure modal container exists
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error('Modal container not found in DOM');
        return;
    }
    
    // Ensure modal structure exists
    let modal = modalContainer.querySelector('.modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content"></div>';
        modalContainer.appendChild(modal);
    }
    
    console.log('Modal system initialized');
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
