// Database operations using IndexedDB
import { APP_CONSTANTS } from './config.js';
import { generateId } from './utils.js';

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(APP_CONSTANTS.DB_NAME, APP_CONSTANTS.DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create the applications store if it doesn't exist
            if (!db.objectStoreNames.contains(APP_CONSTANTS.STORE_NAME)) {
                const store = db.createObjectStore(APP_CONSTANTS.STORE_NAME, { keyPath: 'id' });
                
                // Create indexes for efficient querying
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('applicationDate', 'applicationDate', { unique: false });
                store.createIndex('companyName', 'companyName', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            console.log('Database initialized successfully');
            resolve(db);
        };
        
        request.onerror = (event) => {
            console.error('Database initialization failed:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Add a new application to the database
 * @param {Object} applicationData - Application data
 * @returns {Promise<string>} Application ID
 */
export async function addApplicationToDB(applicationData) {
    return new Promise((resolve, reject) => {
        // Get database instance from global state (temporary solution)
        const db = window.appState?.db || window.db;
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([APP_CONSTANTS.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(APP_CONSTANTS.STORE_NAME);
        
        // Prepare application data
        const application = {
            id: generateId(),
            ...applicationData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Initialize related data arrays if not present
            interviewDates: applicationData.interviewDates || [],
            contacts: applicationData.contacts || [],
            documents: applicationData.documents || []
        };
        
        const request = store.add(application);
        
        request.onsuccess = () => {
            console.log('Application added successfully:', application.id);
            resolve(application.id);
        };
        
        request.onerror = (event) => {
            console.error('Failed to add application:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get an application by ID
 * @param {string} id - Application ID
 * @returns {Promise<Object|null>} Application data or null
 */
export async function getApplicationFromDB(id) {
    return new Promise((resolve, reject) => {
        const db = window.appState?.db || window.db;
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([APP_CONSTANTS.STORE_NAME], 'readonly');
        const store = transaction.objectStore(APP_CONSTANTS.STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = (event) => {
            resolve(event.target.result || null);
        };
        
        request.onerror = (event) => {
            console.error('Failed to get application:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Update an application in the database
 * @param {string} id - Application ID
 * @param {Object} updates - Data to update
 * @returns {Promise<void>}
 */
export async function updateApplicationInDB(id, updates) {
    return new Promise(async (resolve, reject) => {
        try {
            const existingApp = await getApplicationFromDB(id);
            if (!existingApp) {
                reject(new Error('Application not found'));
                return;
            }
            
            const db = window.appState?.db || window.db;
            const transaction = db.transaction([APP_CONSTANTS.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(APP_CONSTANTS.STORE_NAME);
            
            // Merge updates with existing data
            const updatedApp = {
                ...existingApp,
                ...updates,
                id, // Ensure ID doesn't change
                updatedAt: new Date().toISOString()
            };
            
            const request = store.put(updatedApp);
            
            request.onsuccess = () => {
                console.log('Application updated successfully:', id);
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Failed to update application:', event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Delete an application from the database
 * @param {string} id - Application ID
 * @returns {Promise<void>}
 */
export async function deleteApplicationFromDB(id) {
    return new Promise((resolve, reject) => {
        const db = window.appState?.db || window.db;
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([APP_CONSTANTS.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(APP_CONSTANTS.STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => {
            console.log('Application deleted successfully:', id);
            resolve();
        };
        
        request.onerror = (event) => {
            console.error('Failed to delete application:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get all applications from the database
 * @returns {Promise<Array>} Array of applications
 */
export async function getAllApplicationsFromDB() {
    return new Promise((resolve, reject) => {
        const db = window.appState?.db || window.db;
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([APP_CONSTANTS.STORE_NAME], 'readonly');
        const store = transaction.objectStore(APP_CONSTANTS.STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = (event) => {
            const applications = event.target.result || [];
            resolve(applications);
        };
        
        request.onerror = (event) => {
            console.error('Failed to get all applications:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Clear all applications from the database
 * @returns {Promise<void>}
 */
export async function clearAllApplications() {
    return new Promise((resolve, reject) => {
        const db = window.appState?.db || window.db;
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([APP_CONSTANTS.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(APP_CONSTANTS.STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => {
            console.log('All applications cleared successfully');
            resolve();
        };
        
        request.onerror = (event) => {
            console.error('Failed to clear applications:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get applications by status
 * @param {string} status - Status to filter by
 * @returns {Promise<Array>} Array of applications with the specified status
 */
export async function getApplicationsByStatus(status) {
    return new Promise((resolve, reject) => {
        const db = window.appState?.db || window.db;
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([APP_CONSTANTS.STORE_NAME], 'readonly');
        const store = transaction.objectStore(APP_CONSTANTS.STORE_NAME);
        const index = store.index('status');
        const request = index.getAll(status);
        
        request.onsuccess = (event) => {
            resolve(event.target.result || []);
        };
        
        request.onerror = (event) => {
            console.error('Failed to get applications by status:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
export async function getDatabaseStats() {
    try {
        const applications = await getAllApplicationsFromDB();
        
        const stats = {
            total: applications.length,
            statusCounts: {},
            recentApplications: applications
                .filter(app => {
                    const appDate = new Date(app.applicationDate);
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return appDate >= monthAgo;
                }).length
        };
        
        // Count by status
        applications.forEach(app => {
            stats.statusCounts[app.status] = (stats.statusCounts[app.status] || 0) + 1;
        });
        
        return stats;
    } catch (error) {
        console.error('Failed to get database stats:', error);
        return { total: 0, statusCounts: {}, recentApplications: 0 };
    }
}