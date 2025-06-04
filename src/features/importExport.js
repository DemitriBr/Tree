// Import/Export functionality for Job Application Tracker
import { getAllApplicationsFromDB } from '../core/db.js';
import { showModal, hideModal, notifySuccess, notifyError } from '../ui/ui.js';
import { dataSanitizer } from '../security/sanitizer.js';

/**
 * Export applications to JSON file
 */
async function exportToJSON() {
    try {
        const applications = await getAllApplicationsFromDB();
        
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            applications: applications
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-applications-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        notifySuccess('Applications exported successfully');
    } catch (error) {
        console.error('Export error:', error);
        notifyError('Failed to export applications');
    }
}

/**
 * Export applications to CSV file
 */
async function exportToCSV() {
    try {
        const applications = await getAllApplicationsFromDB();
        
        // CSV headers
        const headers = ['Job Title', 'Company', 'Application Date', 'Status', 'Location', 'Salary', 'URL', 'Notes'];
        
        // Convert applications to CSV rows
        const rows = applications.map(app => [
            app.jobTitle,
            app.companyName,
            app.applicationDate,
            app.status,
            app.location || '',
            app.salary || '',
            app.url || '',
            app.notes ? app.notes.replace(/"/g, '""') : ''
        ]);
        
        // Build CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-applications-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        notifySuccess('Applications exported to CSV successfully');
    } catch (error) {
        console.error('CSV export error:', error);
        notifyError('Failed to export to CSV');
    }
}

/**
 * Import applications from file
 */
async function importApplications(file) {
    try {
        const text = await file.text();
        let data;
        
        if (file.type === 'application/json') {
            data = JSON.parse(text);
            
            if (!data.applications || !Array.isArray(data.applications)) {
                throw new Error('Invalid JSON format');
            }
            
            // Import each application
            for (const app of data.applications) {
                const sanitized = dataSanitizer.sanitizeApplicationData(app);
                await addApplicationToDB(sanitized);
            }
            
            notifySuccess(`Imported ${data.applications.length} applications successfully`);
        } else {
            notifyError('Only JSON files are currently supported for import');
        }
        
        // Refresh the current view
        window.location.reload();
    } catch (error) {
        console.error('Import error:', error);
        notifyError('Failed to import applications. Please check the file format.');
    }
}

/**
 * Show export modal
 */
export function showExportModal() {
    const modalContent = `
        <div class="modal-content export-modal">
            <div class="modal-header">
                <h3>📥 Export Applications</h3>
                <button class="modal-close" onclick="window.hideModal()" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Choose export format:</p>
                <div class="export-options">
                    <button class="btn btn-primary" id="exportJSON">
                        <span>📄</span> Export as JSON
                    </button>
                    <button class="btn btn-primary" id="exportCSV">
                        <span>📊</span> Export as CSV
                    </button>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalContent, { ariaLabel: 'Export applications dialog' });
    
    // Set up event handlers
    setTimeout(() => {
        document.getElementById('exportJSON')?.addEventListener('click', () => {
            exportToJSON();
            hideModal();
        });
        
        document.getElementById('exportCSV')?.addEventListener('click', () => {
            exportToCSV();
            hideModal();
        });
    }, 100);
}

/**
 * Show import modal
 */
export function showImportModal() {
    const modalContent = `
        <div class="modal-content import-modal">
            <div class="modal-header">
                <h3>📤 Import Applications</h3>
                <button class="modal-close" onclick="window.hideModal()" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Select a JSON file to import:</p>
                <input type="file" id="importFile" accept=".json" class="file-input">
                <div class="import-info">
                    <p>⚠️ Note: Importing will add new applications without removing existing ones.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.hideModal()">Cancel</button>
                <button class="btn btn-primary" id="confirmImport">Import</button>
            </div>
        </div>
    `;
    
    showModal(modalContent, { ariaLabel: 'Import applications dialog' });
    
    // Set up event handlers
    setTimeout(() => {
        document.getElementById('confirmImport')?.addEventListener('click', async () => {
            const fileInput = document.getElementById('importFile');
            if (fileInput.files.length > 0) {
                await importApplications(fileInput.files[0]);
                hideModal();
            } else {
                notifyError('Please select a file to import');
            }
        });
    }, 100);
}

// Import required function
import { addApplicationToDB } from '../core/db.js';
