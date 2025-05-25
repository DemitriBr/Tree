// Form Setup and Handling
function setupApplicationForm() {
    const form = document.getElementById('applicationForm');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            resetForm();
            // Future: switch to list view
        });
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
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
        // Arrays for future features
        interviewDates: [],
        contacts: [],
        documents: [],
        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        // Check if we're in edit mode (ID field has value)
        const existingId = formData.get('id');
        
        if (existingId) {
            // Edit mode - will be implemented in Step 8
            console.log('Edit mode not yet implemented');
        } else {
            // Add mode
            await addApplicationToDB(applicationData);
            console.log('Application saved successfully');
            resetForm();
            // Future: show success notification
            // Future: switch to list view
        }
    } catch (error) {
        console.error('Error saving application:', error);
        // Future: show error notification
    }
}

// Add application to IndexedDB
function addApplicationToDB(applicationData) {
    return new Promise((resolve, reject) => {
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

// Update the init function to include form setup
async function init() {
    try {
        await initDB();
        console.log('Application initialized successfully');
        
        // Set up form handling
        setupApplicationForm();
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}
// View Management
function setupNavButtons() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetView = e.target.dataset.view;
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
                // Focus on first form field when switching to home
                const firstInput = document.getElementById('jobTitle');
                if (firstInput) {
                    firstInput.focus();
                }
                break;
                
            case 'list':
                // Future: Load and display applications list
                console.log('Switched to list view - ready for Step 6');
                break;
                
            case 'dashboard':
                // Future: Load dashboard statistics
                console.log('Switched to dashboard view');
                break;
                
            case 'kanban':
                // Future: Load kanban board
                console.log('Switched to kanban view');
                break;
        }
    }
}

// Update the cancel button to switch to list view
function updateCancelButton() {
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', cancelBtn._clickHandler);
        cancelBtn._clickHandler = () => {
            resetForm();
            switchView('list');
            
            // Update nav button active states
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.view === 'list') {
                    btn.classList.add('active');
                }
            });
        };
        cancelBtn.addEventListener('click', cancelBtn._clickHandler);
    }
}

// Update the init function to include navigation setup
async function init() {
    try {
        await initDB();
        console.log('Application initialized successfully');
        
        // Set up form handling
        setupApplicationForm();
        
        // Set up navigation
        setupNavButtons();
        
        // Update cancel button behavior
        updateCancelButton();
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

// Also update handleFormSubmit to switch views after saving
async function handleFormSubmit(e) {
    e.preventDefault();
    
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
            
            // Future: show success notification
        }
    } catch (error) {
        console.error('Error saving application:', error);
        // Future: show error notification
    }
}
