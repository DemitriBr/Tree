// Backup functionality for Job Application Tracker
import { getAllApplicationsFromDB } from '../core/db.js';
import { showModal, hideModal, notifySuccess, notifyError } from '../ui/ui.js';
import { eventBus, EVENTS } from '../core/eventBus.js';

// Backup settings
const BACKUP_KEY = 'jobTrackerBackupSettings';
const LAST_BACKUP_KEY = 'jobTrackerLastBackup';

/**
 * Get backup settings from localStorage
 */
function getBackupSettings() {
    const settings = localStorage.getItem(BACKUP_KEY);
    return settings ? JSON.parse(settings) : {
        enabled: false,
        frequency: 'daily',
        includeSettings: true
    };
}

/**
 * Save backup settings
 */
function saveBackupSettings(settings) {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(settings));
}

/**
 * Create a backup
 */
async function createBackup() {
    try {
        const applications = await getAllApplicationsFromDB();
        const settings = getBackupSettings();
        
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            applications: applications,
            settings: settings.includeSettings ? {
                theme: localStorage.getItem('theme'),
                highContrast: localStorage.getItem('highContrast'),
                reducedMotion: localStorage.getItem('reducedMotion')
            } : null
        };
        
        // Store backup in localStorage (in production, this would be sent to a server)
        const backupKey = `backup_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backupData));
        
        // Update last backup time
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
        
        // Clean old backups (keep only last 5)
        cleanOldBackups();
        
        notifySuccess('Backup created successfully');
        return backupData;
    } catch (error) {
        console.error('Backup error:', error);
        notifyError('Failed to create backup');
        throw error;
    }
}

/**
 * Clean old backups
 */
function cleanOldBackups() {
    const backupKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('backup_')) {
            backupKeys.push(key);
        }
    }
    
    // Sort by timestamp (newest first)
    backupKeys.sort((a, b) => {
        const timeA = parseInt(a.split('_')[1]);
        const timeB = parseInt(b.split('_')[1]);
        return timeB - timeA;
    });
    
    // Remove old backups (keep only 5 most recent)
    if (backupKeys.length > 5) {
        for (let i = 5; i < backupKeys.length; i++) {
            localStorage.removeItem(backupKeys[i]);
        }
    }
}

/**
 * Get available backups
 */
function getAvailableBackups() {
    const backups = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('backup_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                backups.push({
                    key: key,
                    timestamp: data.timestamp,
                    applicationCount: data.applications.length
                });
            } catch (error) {
                console.error('Error reading backup:', key, error);
            }
        }
    }
    
    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Restore from backup
 */
async function restoreBackup(backupKey) {
    try {
        const backupData = JSON.parse(localStorage.getItem(backupKey));
        
        if (!backupData || !backupData.applications) {
            throw new Error('Invalid backup data');
        }
        
        // In production, this would restore to the database
        // For now, we'll just export the backup as a file
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-restore-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        notifySuccess('Backup exported for manual restore');
    } catch (error) {
        console.error('Restore error:', error);
        notifyError('Failed to restore backup');
    }
}

/**
 * Check if auto-backup is needed
 */
export function checkAutoBackup() {
    const settings = getBackupSettings();
    
    if (!settings.enabled) return;
    
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    if (!lastBackup) {
        createBackup();
        return;
    }
    
    const lastBackupDate = new Date(lastBackup);
    const now = new Date();
    const hoursSinceBackup = (now - lastBackupDate) / (1000 * 60 * 60);
    
    let shouldBackup = false;
    
    switch (settings.frequency) {
        case 'hourly':
            shouldBackup = hoursSinceBackup >= 1;
            break;
        case 'daily':
            shouldBackup = hoursSinceBackup >= 24;
            break;
        case 'weekly':
            shouldBackup = hoursSinceBackup >= 168;
            break;
    }
    
    if (shouldBackup) {
        createBackup();
    }
}

/**
 * Show backup settings modal
 */
export function showBackupSettingsModal() {
    const settings = getBackupSettings();
    const backups = getAvailableBackups();
    
    const modalContent = `
        <div class="modal-content backup-modal">
            <div class="modal-header">
                <h3>💾 Backup Settings</h3>
                <button class="modal-close" onclick="window.hideModal()" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="backup-settings">
                    <h4>Auto-Backup</h4>
                    <label class="checkbox-label">
                        <input type="checkbox" id="backupEnabled" ${settings.enabled ? 'checked' : ''}>
                        Enable automatic backups
                    </label>
                    
                    <div class="form-group">
                        <label for="backupFrequency">Backup frequency:</label>
                        <select id="backupFrequency" ${!settings.enabled ? 'disabled' : ''}>
                            <option value="hourly" ${settings.frequency === 'hourly' ? 'selected' : ''}>Hourly</option>
                            <option value="daily" ${settings.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                            <option value="weekly" ${settings.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                        </select>
                    </div>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="includeSettings" ${settings.includeSettings ? 'checked' : ''}>
                        Include app settings in backup
                    </label>
                </div>
                
                <div class="backup-actions">
                    <h4>Manual Backup</h4>
                    <button class="btn btn-primary" id="createBackupNow">
                        Create Backup Now
                    </button>
                </div>
                
                <div class="existing-backups">
                    <h4>Available Backups (${backups.length})</h4>
                    ${backups.length > 0 ? `
                        <div class="backup-list">
                            ${backups.map(backup => `
                                <div class="backup-item">
                                    <span>${new Date(backup.timestamp).toLocaleString()} (${backup.applicationCount} items)</span>
                                    <button class="btn btn-sm" data-backup="${backup.key}">Restore</button>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No backups available</p>'}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.hideModal()">Cancel</button>
                <button class="btn btn-primary" id="saveBackupSettings">Save Settings</button>
            </div>
        </div>
    `;
    
    showModal(modalContent, { ariaLabel: 'Backup settings dialog' });
    
    // Set up event handlers
    setTimeout(() => {
        // Enable/disable frequency selector
        document.getElementById('backupEnabled')?.addEventListener('change', (e) => {
            document.getElementById('backupFrequency').disabled = !e.target.checked;
        });
        
        // Create backup now
        document.getElementById('createBackupNow')?.addEventListener('click', async () => {
            await createBackup();
            hideModal();
            showBackupSettingsModal(); // Refresh to show new backup
        });
        
        // Restore backup buttons
        document.querySelectorAll('[data-backup]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backupKey = e.target.getAttribute('data-backup');
                restoreBackup(backupKey);
            });
        });
        
        // Save settings
        document.getElementById('saveBackupSettings')?.addEventListener('click', () => {
            const newSettings = {
                enabled: document.getElementById('backupEnabled').checked,
                frequency: document.getElementById('backupFrequency').value,
                includeSettings: document.getElementById('includeSettings').checked
            };
            
            saveBackupSettings(newSettings);
            notifySuccess('Backup settings saved');
            hideModal();
        });
    }, 100);
}

// Set up auto-backup check
eventBus.on(EVENTS.APPLICATION_ADDED, checkAutoBackup);
eventBus.on(EVENTS.APPLICATION_UPDATED, checkAutoBackup);

// Check on startup
setTimeout(checkAutoBackup, 5000);
