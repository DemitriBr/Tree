/**
 * Job Application Tracker (Version 3)
 * A single-page application to track job applications using local storage
 * Features: CRUD operations, data visualization, filtering, reminders, and responsive design
 */

// DOM Elements
const addApplicationView = document.getElementById('add-application-view');
const listApplicationsView = document.getElementById('list-applications-view');
const remindersView = document.getElementById('reminders-view');
const viewAddBtn = document.getElementById('view-add-btn');
const viewListBtn = document.getElementById('view-list-btn');
const viewRemindersBtn = document.getElementById('view-reminders-btn');
const applicationForm = document.getElementById('application-form');
const applicationsList = document.getElementById('applications-list');
const remindersList = document.getElementById('reminders-list');
const noApplicationsMessage = document.getElementById('no-applications-message');
const noRemindersMessage = document.getElementById('no-reminders-message');
const dashboardView = document.getElementById('dashboard');
const tableViewBtn = document.getElementById('table-view-btn');
const statsViewBtn = document.getElementById('stats-view-btn');
const formTitle = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const detailsModal = document.getElementById('details-modal');
const applicationDetails = document.getElementById('application-details');

// Pagination elements
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageIndicator = document.getElementById('page-indicator');

// Filter elements
const filterStatus = document.getElementById('filter-status');
const sortBy = document.getElementById('sort-by');
const searchInput = document.getElementById('search');

// Chart.js elements
let statusChart = null;
let timelineChart = null;

// Application Data
let applications = [];
let currentEditId = null;
let currentPage = 1;
let itemsPerPage = 10;
let filteredApplications = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Load applications from local storage
    loadApplications();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for reminders
    checkForReminders();
    
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
    viewRemindersBtn.addEventListener('click', showRemindersView);
    
    // Form submission
    applicationForm.addEventListener('submit', handleFormSubmit);
    
    // Cancel edit button
    cancelEditBtn.addEventListener('click', cancelEdit);
    
    // Pre-fill today's date in the date input
    document.getElementById('application-date').valueAsDate = new Date();
    
    // Data export/import functionality
    document.getElementById('export-btn').addEventListener('click', exportApplications);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importApplications);
    
    // Dashboard view toggle
    tableViewBtn.addEventListener('click', showTableView);
    statsViewBtn.addEventListener('click', showStatsView);
    
    // Filter and sort listeners
    filterStatus.addEventListener('change', filterAndSortApplications);
    sortBy.addEventListener('change', filterAndSortApplications);
    searchInput.addEventListener('input', debounce(filterAndSortApplications, 300));
    
    // Pagination listeners
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderApplicationsList();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderApplicationsList();
        }
    });
    
    // Modal close button
    document.querySelector('.close-modal').addEventListener('click', () => {
        detailsModal.classList.add('hidden');
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === detailsModal) {
            detailsModal.classList.add('hidden');
        }
    });
    
    // Handle window resize for responsive charts
    window.addEventListener('resize', debounce(() => {
        if (statusChart) {
            statusChart.resize();
        }
        if (timelineChart) {
            timelineChart.resize();
        }
    }, 250));
}

/**
 * Show the Add Application view and hide other views
 */
function showAddApplicationView() {
    addApplicationView.classList.remove('hidden');
    listApplicationsView.classList.add('hidden');
    remindersView.classList.add('hidden');
    
    // Update active button state
    viewAddBtn.classList.add('active');
    viewListBtn.classList.remove('active');
    viewRemindersBtn.classList.remove('active');
    
    // Clear any existing form data
    if (!currentEditId) {
        applicationForm.reset();
        document.getElementById('application-date').valueAsDate = new Date();
    }
}

/**
 * Show the List
