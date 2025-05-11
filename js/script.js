/**
 * Job Application Tracker
 * A single-page application to track job applications using local storage
 */

// DOM Elements
const addApplicationView = document.getElementById('add-application-view');
const listApplicationsView = document.getElementById('list-applications-view');
const viewAddBtn = document.getElementById('view-add-btn');
const viewListBtn = document.getElementById('view-list-btn');
const applicationForm = document.getElementById('application-form');
const applicationsList = document.getElementById('applications-list');
const noApplicationsMessage = document.getElementById('no-applications-message');

// Application Data
let applications = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Load applications from local storage
    loadApplications();
    
    // Set up event listeners
    setupEventListeners();
    
    // Show the list of applications if there are any
    renderApplicationsList();
});

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // Navigation buttons
    viewAddBtn.addEventListener('click', showAddApplicationView);
    viewListBtn.addEventListener('click', showListApplicationsView);
    
    // Form submission
    applicationForm.addEventListener('submit', handleFormSubmit);
    
    // Pre-fill today's date in the date input
    document.getElementById('application-date').valueAsDate = new Date();
}

/**
 * Show the Add Application view and hide the List Applications view
 */
function showAddApplicationView() {
    addApplicationView.classList.remove('hidden');
    listApplicationsView.classList.add('hidden');
    
    // Update active button state
    viewAddBtn.classList.add('active');
    viewListBtn.classList.remove('active');
}

/**
 * Show the List Applications view and hide the Add Application view
 */
function showListApplicationsView() {
    listApplicationsView.classList.remove('hidden');
    addApplicationView.classList.add('hidden');
    
    // Update active button state
    viewListBtn.classList.add('active');
    viewAddBtn.classList.remove('active');
    
    // Refresh the applications list
    renderApplicationsList();
}

/**
 * Handle the form submission to add a new job application
 * @param {Event} event - The form submission event
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const jobTitle = document.getElementById('job-title').value;
    const companyName = document.getElementById('company-name').value;
    const applicationDate = document.getElementById('application-date').value;
    const status = document.getElementById('status').value;
    const notes = document.getElementById('notes').value;
    
    // Create new application object
    const newApplication = {
        id: Date.now(), // Use timestamp as unique ID
        jobTitle,
        companyName,
        applicationDate,
        status,
        notes,
        createdAt: new Date().toISOString()
    };
    
    // Add to applications array
    applications.push(newApplication);
    
    // Save to local storage
    saveApplications();
    
    // Reset the form
    applicationForm.reset();
    document.getElementById('application-date').valueAsDate = new Date();
    
    // Show success message (can be enhanced with a proper notification system)
    alert('Job application saved successfully!');
    
    // Switch to the list view to show the new application
    showListApplicationsView();
}

/**
 * Load applications from local storage
 */
function loadApplications() {
    const storedApplications = localStorage.getItem('jobApplications');
    
    if (storedApplications) {
        try {
            applications = JSON.parse(storedApplications);
        } catch (error) {
            console.error('Error parsing applications from local storage:', error);
            applications = [];
        }
    }
}

/**
 * Save applications to local storage
 */
function saveApplications() {
    try {
        localStorage.setItem('jobApplications', JSON.stringify(applications));
    } catch (error) {
        console.error('Error saving applications to local storage:', error);
        alert('Failed to save your application. Please try again.');
    }
}

/**
 * Render the list of applications
 */
function renderApplicationsList() {
    // Clear the current list
    applicationsList.innerHTML = '';
    
    // Show/hide no applications message
    if (applications.length === 0) {
        noApplicationsMessage.classList.remove('hidden');
        document.getElementById('applications-table').classList.add('hidden');
        return;
    } else {
        noApplicationsMessage.classList.add('hidden');
        document.getElementById('applications-table').classList.remove('hidden');
    }
    
    // Sort applications by date (newest first)
    const sortedApplications = [...applications].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Add each application to the list
    sortedApplications.forEach(application => {
        const row = document.createElement('tr');
        
        // Format the date nicely
        const date = new Date(application.applicationDate);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
        
        // Create table cells
        row.innerHTML = `
            <td>${application.jobTitle}</td>
            <td>${application.companyName}</td>
            <td>${formattedDate}</td>
            <td><span class="status-badge status-${application.status}">${application.status}</span></td>
            <td>${application.notes}</td>
            <td>
                <button class="action-btn delete-btn" data-id="${application.id}">Delete</button>
            </td>
        `;
        
        applicationsList.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDeleteApplication);
    });
}

/**
 * Handle deleting an application
 * @param {Event} event - The click event on the delete button
 */
function handleDeleteApplication(event) {
    const applicationId = parseInt(event.target.getAttribute('data-id'));
    
    if (confirm('Are you sure you want to delete this job application?')) {
        // Remove the application from the array
        applications = applications.filter(app => app.id !== applicationId);
        
        // Save to local storage
        saveApplications();
        
        // Re-render the list
        renderApplicationsList();
    }
}
