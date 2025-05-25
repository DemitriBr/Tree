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
