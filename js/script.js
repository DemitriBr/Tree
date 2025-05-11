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
        // Check available space before saving
        const data = JSON.stringify(applications);
        const size = new Blob([data]).size;
        
        // LocalStorage has ~5MB limit in most browsers
        if (size > 4 * 1024 * 1024) { // If approaching 4MB
            alert('Warning: You are approaching storage limits. Consider exporting your data soon.');
        }
        
        localStorage.setItem('jobApplications', data);
    } catch (error) {
        console.error('Error saving applications to local storage:', error);
        
        if (error.name === 'QuotaExceededError') {
            alert('Storage is full. Please delete some applications or clear browser data to make space.');
        } else {
            alert('Failed to save your application. Please try again.');
        }
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
        dashboardView.classList.add('hidden');
        return;
    } else {
        noApplicationsMessage.classList.add('hidden');
        document.getElementById('applications-table').classList.remove('hidden');
    }
    
    // Update dashboard
    updateDashboard();
    
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

/**
 * Export applications data to a downloadable JSON file
 */
function exportApplications() {
    if (applications.length === 0) {
        alert('No applications to export');
        return;
    }
    
    // Create data object with metadata
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        applications: applications
    };
    
    // Create a blob with the data
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-applications-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Import applications from a JSON file
 * @param {Event} event - The file input change event
 */
function importApplications(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Basic validation
            if (Array.isArray(importData.applications)) {
                if (confirm(`Import ${importData.applications.length} job applications?`)) {
                    // Merge with existing applications, avoiding duplicates
                    const existingIds = new Set(applications.map(app => app.id));
                    const newApps = importData.applications.filter(app => !existingIds.has(app.id));
                    
                    applications = [...applications, ...newApps];
                    saveApplications();
                    renderApplicationsList();
                    
                    alert(`Successfully imported ${newApps.length} applications.`);
                }
            } else {
                throw new Error('Invalid file format');
            }
        } catch (error) {
            console.error('Error importing applications:', error);
            alert('Failed to import. Please make sure the file is valid JSON exported from this application.');
        }
        
        // Reset the file input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

/**
 * Show the table view and hide the stats view
 */
function showTableView() {
    document.getElementById('applications-table').classList.remove('hidden');
    dashboardView.classList.add('hidden');
    tableViewBtn.classList.add('active');
    statsViewBtn.classList.remove('active');
}

/**
 * Show the stats view and hide the table view
 */
function showStatsView() {
    document.getElementById('applications-table').classList.add('hidden');
    dashboardView.classList.remove('hidden');
    tableViewBtn.classList.remove('active');
    statsViewBtn.classList.add('active');
}

/**
 * Update the dashboard with current application statistics and chart
 */
function updateDashboard() {
    // Count applications by status
    const statusCounts = {
        'Applied': 0,
        'Interviewing': 0,
        'Offer': 0,
        'Rejected': 0
    };
    
    applications.forEach(app => {
        if (statusCounts.hasOwnProperty(app.status)) {
            statusCounts[app.status]++;
        }
    });
    
    // Update stat cards
    document.getElementById('total-applications').textContent = applications.length;
    document.getElementById('interviews-count').textContent = statusCounts['Interviewing'];
    document.getElementById('offers-count').textContent = statusCounts['Offer'];
    
    // Create or update chart
    createStatusChart(statusCounts);
}

/**
 * Create or update the status distribution chart
 * @param {Object} statusCounts - The count of applications by status
 */
function createStatusChart(statusCounts) {
    const ctx = document.getElementById('status-chart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (statusChart) {
        statusChart.destroy();
    }
    
    // Define chart colors
    const colors = {
        'Applied': '#3498db',
        'Interviewing': '#f39c12',
        'Offer': '#2ecc71',
        'Rejected': '#e74c3c'
    };
    
    // Create new chart
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: Object.keys(statusCounts).map(key => colors[key]),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}
