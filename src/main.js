// Main application entry point
import { initDB } from './core/db.js';
import { appState } from './core/state.js';
import { eventBus, EVENTS } from './core/eventBus.js';
import { setupNavigation } from './ui/navigation.js';
import { setupApplicationForm } from './ui/formHandler.js';
import { initializeModalSystem } from './ui/ui.js';
import { performanceMonitor } from './services/performanceMonitor.js';
import { lazyLoader } from './services/lazyLoader.js';

/**
 * Set up event listeners for buttons that had inline handlers
 */
function setupEventListeners() {
    // Keyboard shortcuts button
    const keyboardShortcutsBtn = document.getElementById('keyboard-shortcuts-btn');
    if (keyboardShortcutsBtn) {
        keyboardShortcutsBtn.addEventListener('click', function(event) {
            event.preventDefault();
            import('./ui/navigation.js').then(module => {
                module.showKeyboardShortcuts();
            });
        });
    }
    
    // High contrast toggle button  
    const highContrastBtn = document.getElementById('high-contrast-btn');
    if (highContrastBtn) {
        highContrastBtn.addEventListener('click', function(event) {
            event.preventDefault();
            import('./services/accessibility.js').then(module => {
                if (module.accessibilityManager && module.accessibilityManager.toggleHighContrast) {
                    module.accessibilityManager.toggleHighContrast();
                }
            });
        });
    }
    
    // Export data button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function(event) {
            event.preventDefault();
            import('./features/importExport.js').then(module => {
                if (module.showExportModal) {
                    module.showExportModal();
                }
            });
        });
    }
    
    // Import data button
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.addEventListener('click', function(event) {
            event.preventDefault();
            import('./features/importExport.js').then(module => {
                if (module.showImportModal) {
                    module.showImportModal();
                }
            });
        });
    }
    
    // Backup settings button
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) {
        backupBtn.addEventListener('click', function(event) {
            event.preventDefault();
            import('./features/backup.js').then(module => {
                if (module.showBackupSettingsModal) {
                    module.showBackupSettingsModal();
                }
            });
        });
    }
}

/**
 * Initialize offline/online detection
 */
function setupOfflineDetection() {
    function updateOnlineStatus() {
        const isOnline = navigator.onLine;
        appState.setOfflineStatus(!isOnline);
        
        if (isOnline) {
            console.log('📶 Application is online');
            eventBus.emit(EVENTS.OFFLINE_STATUS_CHANGED, { isOffline: false });
        } else {
            console.log('📴 Application is offline');
            eventBus.emit(EVENTS.OFFLINE_STATUS_CHANGED, { isOffline: true });
        }
    }
    
    // Initial status check
    updateOnlineStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

/**
 * Set up global error handling
 */
function setupErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        eventBus.emit(EVENTS.ERROR_OCCURRED, {
            type: 'unhandled_rejection',
            error: event.reason
        });
        
        // Show user-friendly error message
        import('./ui/ui.js').then(module => {
            module.notifyError('An unexpected error occurred. Please try again.');
        });
    });
    
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
        console.error('JavaScript error:', event.error);
        eventBus.emit(EVENTS.ERROR_OCCURRED, {
            type: 'javascript_error',
            error: event.error,
            filename: event.filename,
            lineno: event.lineno
        });
    });
}

/**
 * Initialize accessibility features
 */
function initializeAccessibility() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    appState.setNestedState('ui', 'reducedMotion', prefersReducedMotion);
    
    if (prefersReducedMotion) {
        document.body.classList.add('reduce-motion');
    }
    
    // Listen for changes in motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        appState.setNestedState('ui', 'reducedMotion', e.matches);
        document.body.classList.toggle('reduce-motion', e.matches);
    });
    
    // Initialize high contrast from stored preference
    const storedHighContrast = localStorage.getItem('highContrast') === 'true';
    appState.setNestedState('ui', 'highContrast', storedHighContrast);
    
    if (storedHighContrast) {
        document.body.classList.add('high-contrast');
    }
}

/**
 * Register service worker
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered successfully:', registration);
            appState.setState('serviceWorkerRegistration', registration);
            
            // Listen for service worker updates
            registration.addEventListener('updatefound', () => {
                console.log('🔄 Service Worker update found');
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content is available, notify user
                        import('./ui/ui.js').then(module => {
                            module.notifyInfo('New version available! Refresh to update.', 0);
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }
}

/**
 * Application initialization
 */
async function init() {
    performanceMonitor.start('app-initialization');
    
    try {
        console.log('🚀 Initializing Job Application Tracker...');
        
        // Initialize database
        performanceMonitor.start('database-init');
        const db = await initDB();
        appState.setState('db', db);
        performanceMonitor.end('database-init');
        console.log('✅ Database initialized');
        
        // Set up error handling
        setupErrorHandling();
        
        // Set up offline detection
        setupOfflineDetection();
        
        // Initialize accessibility features
        initializeAccessibility();
        
        // Set up UI components
        performanceMonitor.start('ui-setup');
        setupApplicationForm();
        setupNavigation();
        initializeModalSystem();
        performanceMonitor.end('ui-setup');
        
        // Set up event listeners for inline handlers replacement
        setupEventListeners();
        
        // Register service worker for PWA functionality
        await registerServiceWorker();
        
        // Preload critical modules
        await lazyLoader.preloadCriticalModules();
        
        // Emit initialization complete event
        eventBus.emit(EVENTS.DB_INITIALIZED, { db });
        
        performanceMonitor.end('app-initialization');
        console.log('✅ Application initialized successfully');
        
        // Generate initial performance report
        setTimeout(() => {
            const report = performanceMonitor.generatePerformanceReport();
            console.log('📊 Initial performance report:', report);
        }, 1000);
        
        // Show welcome message for first-time users
        checkFirstTimeUser();
        
    } catch (error) {
        performanceMonitor.end('app-initialization');
        console.error('❌ Failed to initialize application:', error);
        
        // Show error message to user
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #e74c3c;">
                <h1>❌ Application Failed to Load</h1>
                <p>There was an error initializing the application.</p>
                <p>Please refresh the page or try again later.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

/**
 * Check if this is a first-time user and show welcome message
 */
async function checkFirstTimeUser() {
    try {
        const { getAllApplicationsFromDB } = await import('./core/db.js');
        const applications = await getAllApplicationsFromDB();
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        
        if (applications.length === 0 && !hasSeenWelcome) {
            setTimeout(() => {
                import('./ui/ui.js').then(module => {
                    module.showAlertModal(
                        'Welcome to Job Application Tracker! 👋',
                        'Get started by adding your first job application using the form below.',
                        'info'
                    );
                });
                localStorage.setItem('hasSeenWelcome', 'true');
            }, 1000);
        }
    } catch (error) {
        console.error('Error checking first-time user:', error);
    }
}

/**
 * Set up development debugging tools
 */
function setupDevelopmentTools() {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        // Make debugging tools available globally
        window.appState = appState;
        window.eventBus = eventBus;
        
        // Debug helper functions
        window.debugApp = {
            getState: () => appState.getState(),
            clearData: async () => {
                const { clearAllApplications } = await import('./core/db.js');
                await clearAllApplications();
                console.log('All data cleared');
            },
            generateTestData: async (count = 5) => {
                const { generateId } = await import('./core/utils.js');
                const { addApplicationToDB } = await import('./core/db.js');
                
                const companies = ['Google', 'Microsoft', 'Apple', 'Amazon', 'Meta'];
                const titles = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Product Manager'];
                const statuses = ['applied', 'screening', 'interview', 'offer', 'rejected'];
                
                for (let i = 0; i < count; i++) {
                    const data = {
                        jobTitle: titles[Math.floor(Math.random() * titles.length)],
                        companyName: companies[Math.floor(Math.random() * companies.length)],
                        applicationDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        status: statuses[Math.floor(Math.random() * statuses.length)],
                        location: 'Remote',
                        notes: `Test application #${i + 1}`
                    };
                    
                    await addApplicationToDB(data);
                }
                
                console.log(`Generated ${count} test applications`);
            },
            showEventLog: () => {
                console.log('Event bus debug info:', eventBus.getDebugInfo());
            }
        };
        
        console.log('🛠️ Development tools available: window.debugApp');
    }
}

// Set up development tools
setupDevelopmentTools();

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export for potential use by other modules
export { init };