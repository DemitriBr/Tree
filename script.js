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

// Switch between views
function switchView(viewName) {
    console.log('Switching to view:', viewName);
    
    // Hide all views
    const allViews = document.querySelectorAll('.view');
    console.log('Found views:', allViews.length);
    
    allViews.forEach(view => {
        console.log('Hiding view:', view.id);
        view.classList.remove('active');
    });
    
    // Show the selected view
    const targetView = document.getElementById(`${viewName}View`);
    console.log('Target view element:', targetView);
    
    if (targetView) {
        targetView.classList.add('active');
        console.log('Activated view:', targetView.id);
        
        // Perform view-specific actions
        switch(viewName) {
            case 'home':
                const firstInput = document.getElementById('jobTitle');
                if (firstInput) {
                    firstInput.focus();
                }
                break;
                
            case 'list':
                console.log('Switched to list view - ready for Step 6');
                break;
                
            case 'dashboard':
                console.log('Switched to dashboard view');
                break;
                
            case 'kanban':
                console.log('Switched to kanban view');
                break;
        }
    } else {
        console.error('View not found:', `${viewName}View`);
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
    const applicationData = {
        id: formData.get('id') || generateId(),
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
    
    try {
        const existingId = formData.get('id');
        
        if (existingId) {
            console.log('Edit mode not yet implemented');
        } else {
            await addApplicationToDB(applicationData);
            console.log('Application saved successfully');
            resetForm();
            
            // Switch to list view after saving
            switchView('list');
            
            // Update nav button active states
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.view === 'list') {
                    btn.classList.add('active');
                }
            });
        }
    } catch (error) {
        console.error('Error saving application:', error);
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

// Reset form to initial state
function resetForm() {
    console.log('Resetting form');
    const form = document.getElementById('applicationForm');
    const formTitle = document.getElementById('formTitle');
    
    if (form) {
        form.reset();
        document.getElementById('applicationId').value = '';
    }
    
    if (formTitle) {
        formTitle.textContent = 'Add New Application';
    }
}

// Initialize the application
async function init() {
    console.log('Initializing application...');
    
    try {
        await initDB();
        console.log('Database initialized');
        
        // Set up form handling
        setupApplicationForm();
        
        // Set up navigation
        setupNavButtons();
        
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
                <h3>No applications yet</h3>
                <p>Start tracking your job applications by clicking "Add Application"</p>
            </div>
        `;
    } else {
        // Sort by application date (newest first)
        applications.sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate));
        
        // Create and append cards
        applications.forEach(app => {
            const card = createApplicationCard(app);
            listContainer.appendChild(card);
        });
    }
}

// Update the switchView function to load applications when switching to list view
function switchView(viewName) {
    console.log('Switching to view:', viewName);
    
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
                break;
                
            case 'dashboard':
                console.log('Switched to dashboard view');
                break;
                
            case 'kanban':
                console.log('Switched to kanban view');
                break;
        }
    }
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

// Setup action buttons event listeners using event delegation
function setupActionButtonsListeners() {
    const listContainer = document.getElementById('listContainer');
    
    if (!listContainer) {
        console.error('List container not found for action buttons');
        return;
    }
    
    // Remove any existing listeners to avoid duplicates
    listContainer.removeEventListener('click', handleActionButtonClick);
    
    // Add event delegation listener
    listContainer.addEventListener('click', handleActionButtonClick);
}

// Handle action button clicks
async function handleActionButtonClick(e) {
    // Check if clicked element or its parent is an action button
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    
    if (deleteBtn) {
        e.stopPropagation(); // Prevent card click
        const applicationId = deleteBtn.dataset.id;
        
        // Show confirmation dialog
        const applicationCard = deleteBtn.closest('.application-card');
        const jobTitle = applicationCard.querySelector('.job-title').textContent;
        const companyName = applicationCard.querySelector('.company-info strong').textContent;
        
        const confirmDelete = confirm(`Are you sure you want to delete the application for "${jobTitle}" at ${companyName}?`);
        
        if (confirmDelete) {
            try {
                // Add loading state
                deleteBtn.disabled = true;
                deleteBtn.textContent = '⏳';
                
                // Delete from database
                await deleteApplicationFromDB(applicationId);
                
                // Animate card removal
                applicationCard.style.opacity = '0';
                applicationCard.style.transform = 'translateX(-100%)';
                
                setTimeout(() => {
                    // Re-render the list
                    renderApplicationsList();
                }, 300);
                
                // Future: Show success notification
                console.log('Application deleted successfully');
                
            } catch (error) {
                console.error('Error deleting application:', error);
                // Reset button state
                deleteBtn.disabled = false;
                deleteBtn.textContent = '🗑️';
                
                // Future: Show error notification
                alert('Failed to delete application. Please try again.');
            }
        }
    } else if (editBtn) {
        e.stopPropagation(); // Prevent card click
        const applicationId = editBtn.dataset.id;
        console.log('Edit button clicked for ID:', applicationId);
        // Edit functionality will be implemented in Step 8
    }
}

// Update the renderApplicationsList function to setup listeners after rendering
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
                <h3>No applications yet</h3>
                <p>Start tracking your job applications by clicking "Add Application"</p>
            </div>
        `;
    } else {
        // Sort by application date (newest first)
        applications.sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate));
        
        // Create and append cards
        applications.forEach(app => {
            const card = createApplicationCard(app);
            listContainer.appendChild(card);
        });
        
        // Setup action button listeners after cards are rendered
        setupActionButtonsListeners();
    }
}

// Update the init function to include action buttons setup
async function init() {
    try {
        await initDB();
        console.log('Database initialized');
        
        // Set up form handling
        setupApplicationForm();
        
        // Set up navigation
        setupNavButtons();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
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
        alert('Failed to load application for editing');
    }
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

// Update the handleActionButtonClick function to handle edit button
async function handleActionButtonClick(e) {
    // Check if clicked element or its parent is an action button
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    
    if (deleteBtn) {
        e.stopPropagation();
        const applicationId = deleteBtn.dataset.id;
        
        // Show confirmation dialog
        const applicationCard = deleteBtn.closest('.application-card');
        const jobTitle = applicationCard.querySelector('.job-title').textContent;
        const companyName = applicationCard.querySelector('.company-info strong').textContent;
        
        const confirmDelete = confirm(`Are you sure you want to delete the application for "${jobTitle}" at ${companyName}?`);
        
        if (confirmDelete) {
            try {
                // Add loading state
                deleteBtn.disabled = true;
                deleteBtn.textContent = '⏳';
                
                // Delete from database
                await deleteApplicationFromDB(applicationId);
                
                // Animate card removal
                applicationCard.style.opacity = '0';
                applicationCard.style.transform = 'translateX(-100%)';
                
                setTimeout(() => {
                    // Re-render the list
                    renderApplicationsList();
                }, 300);
                
                console.log('Application deleted successfully');
                
            } catch (error) {
                console.error('Error deleting application:', error);
                // Reset button state
                deleteBtn.disabled = false;
                deleteBtn.textContent = '🗑️';
                alert('Failed to delete application. Please try again.');
            }
        }
    } else if (editBtn) {
        e.stopPropagation();
        const applicationId = editBtn.dataset.id;
        console.log('Edit button clicked for ID:', applicationId);
        
        // Load the application for editing
        await loadApplicationForEdit(applicationId);
    }
}

// Update the handleFormSubmit function to handle both add and edit modes
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
        alert('Failed to save application. Please try again.');
    }
}

// Update resetForm to ensure it clears the ID field
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
// Dark Mode Management
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

// Update the init function to include dark mode setup
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
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}
// Search, Filter, Sort State Management
let searchFilterState = {
    searchTerm: '',
    statusFilter: '',
    dateRangeFilter: '',
    sortBy: 'date',
    sortDirection: 'desc'
};

// Debounce function for search input (with debug logging)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            console.log('Debounce executing function');
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        console.log('Debounce timer reset');
    };
}
// Move this function OUTSIDE and BEFORE setupSearchFilterSort
function debugSearchInput() {
    const searchInput = document.getElementById('searchInput');
    console.log('Debug: Search input element:', searchInput);
    
    if (searchInput) {
        // Add multiple listeners to debug
        searchInput.addEventListener('input', (e) => {
            console.log('Direct input event:', e.target.value);
        });
        
        searchInput.addEventListener('keyup', (e) => {
            console.log('Keyup event:', e.target.value);
        });
        
        // Also check if the debounced version works
        const testDebounced = debounce(() => {
            console.log('Debounced fired!');
        }, 300);
        
        searchInput.addEventListener('input', testDebounced);
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

    } 
    
    // Setup search input with debounce
    if (searchInput) {
        const debouncedSearch = debounce((e) => {
            searchFilterState.searchTerm = e.target.value.toLowerCase();
            console.log('Search term:', searchFilterState.searchTerm);
            // filterSortAndRender() will be implemented in Step 13
        }, 300);
        
        searchInput.addEventListener('input', debouncedSearch);
    }
    
    // Setup status filter
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            searchFilterState.statusFilter = e.target.value;
            console.log('Status filter:', searchFilterState.statusFilter);
            // filterSortAndRender() will be implemented in Step 13
        });
    }
    
    // Setup date range filter
    if (dateRangeFilter) {
        dateRangeFilter.addEventListener('change', (e) => {
            searchFilterState.dateRangeFilter = e.target.value;
            console.log('Date range filter:', searchFilterState.dateRangeFilter);
            // filterSortAndRender() will be implemented in Step 13
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
            // filterSortAndRender() will be implemented in Step 13
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
            // filterSortAndRender() will be implemented in Step 13
        });
    }
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

// Update switchView to setup controls when switching to list view
function switchView(viewName) {
    console.log('Switching to view:', viewName);
    
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
                
            // Call this when switching to list view
// Add this line in the 'list' case of switchView:
case 'list':
    console.log('Loading applications list...');
    renderApplicationsList();
    setupSearchFilterSort();
    debugSearchInput(); // Add this line
    break;
                
            case 'dashboard':
                console.log('Switched to dashboard view');
                break;
                
            case 'kanban':
                console.log('Switched to kanban view');
                break;
        }
    }
}

// Placeholder functions for Step 13
function applyFilters(applications) {
    // Will be implemented in Step 13
    console.log('applyFilters called - to be implemented');
    return applications;
}

function applySorting(applications) {
    // Will be implemented in Step 13
    console.log('applySorting called - to be implemented');
    return applications;
}

function filterSortAndRender() {
    // Will be implemented in Step 13
    console.log('filterSortAndRender called - to be implemented');
}
