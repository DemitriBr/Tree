// Application state management

/**
 * Centralized application state management
 */
export class AppState {
    constructor() {
        // Database instance
        this.db = null;
        
        // Modal state management
        this.modals = {
            active: null,
            stack: [],
            transitioning: false
        };
        
        // Search and filter state
        this.search = {
            query: '',
            statusFilter: '',
            dateRangeFilter: '',
            sortBy: 'date',
            sortDirection: 'desc',
            lastResults: []
        };
        
        // Kanban drag state
        this.kanban = {
            draggedCard: null,
            draggedApplicationId: null,
            originalStatus: null,
            refreshInterval: null
        };
        
        // Offline state
        this.offline = {
            isOffline: false,
            pendingSync: false,
            queuedOperations: []
        };
        
        // Current view state
        this.ui = {
            currentView: 'home',
            theme: 'light',
            highContrast: false,
            reducedMotion: false
        };
        
        // Notification state
        this.notifications = {
            queue: [],
            active: 0,
            maxVisible: 3
        };
        
        // Performance monitoring
        this.performance = {
            marks: new Map(),
            measurements: []
        };
        
        // Event listeners for state changes
        this.listeners = new Map();
    }
    
    /**
     * Get current state
     * @param {string} key - State key (optional)
     * @returns {*} State value or entire state
     */
    getState(key = null) {
        if (key) {
            return this[key];
        }
        return {
            db: this.db,
            modals: this.modals,
            search: this.search,
            kanban: this.kanban,
            offline: this.offline,
            ui: this.ui,
            notifications: this.notifications
        };
    }
    
    /**
     * Update state and notify listeners
     * @param {string} key - State key
     * @param {*} value - New value
     * @param {boolean} notify - Whether to notify listeners
     */
    setState(key, value, notify = true) {
        const oldValue = this[key];
        this[key] = value;
        
        if (notify) {
            this.notifyListeners(key, value, oldValue);
        }
    }
    
    /**
     * Update nested state
     * @param {string} parentKey - Parent state key
     * @param {string} childKey - Child key
     * @param {*} value - New value
     */
    setNestedState(parentKey, childKey, value) {
        if (this[parentKey] && typeof this[parentKey] === 'object') {
            this[parentKey][childKey] = value;
            this.notifyListeners(`${parentKey}.${childKey}`, value);
        }
    }
    
    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        
        this.listeners.get(key).push(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Notify listeners of state changes
     * @param {string} key - State key that changed
     * @param {*} newValue - New value
     * @param {*} oldValue - Previous value
     */
    notifyListeners(key, newValue, oldValue = null) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Error in state listener for ${key}:`, error);
                }
            });
        }
    }
    
    /**
     * Modal state helpers
     */
    openModal(modalId, data = null) {
        this.modals.stack.push(this.modals.active);
        this.setNestedState('modals', 'active', { id: modalId, data });
    }
    
    closeModal() {
        this.setNestedState('modals', 'active', this.modals.stack.pop() || null);
    }
    
    isModalOpen(modalId = null) {
        if (modalId) {
            return this.modals.active?.id === modalId;
        }
        return this.modals.active !== null;
    }
    
    /**
     * Search state helpers
     */
    updateSearchQuery(query) {
        this.setNestedState('search', 'query', query);
    }
    
    updateFilters(filters) {
        Object.keys(filters).forEach(key => {
            this.setNestedState('search', key, filters[key]);
        });
    }
    
    clearFilters() {
        this.setNestedState('search', 'query', '');
        this.setNestedState('search', 'statusFilter', '');
        this.setNestedState('search', 'dateRangeFilter', '');
    }
    
    /**
     * UI state helpers
     */
    switchView(viewName) {
        const oldView = this.ui.currentView;
        this.setNestedState('ui', 'currentView', viewName);
        return oldView;
    }
    
    toggleTheme() {
        const newTheme = this.ui.theme === 'light' ? 'dark' : 'light';
        this.setNestedState('ui', 'theme', newTheme);
        return newTheme;
    }
    
    toggleHighContrast() {
        const newValue = !this.ui.highContrast;
        this.setNestedState('ui', 'highContrast', newValue);
        return newValue;
    }
    
    /**
     * Notification helpers
     */
    addNotification(notification) {
        this.notifications.queue.push({
            id: Date.now().toString(),
            timestamp: Date.now(),
            ...notification
        });
        this.notifyListeners('notifications.queue', this.notifications.queue);
    }
    
    removeNotification(notificationId) {
        this.notifications.queue = this.notifications.queue.filter(
            n => n.id !== notificationId
        );
        this.notifyListeners('notifications.queue', this.notifications.queue);
    }
    
    /**
     * Offline state helpers
     */
    setOfflineStatus(isOffline) {
        this.setNestedState('offline', 'isOffline', isOffline);
    }
    
    addOfflineOperation(operation) {
        this.offline.queuedOperations.push(operation);
        this.notifyListeners('offline.queuedOperations', this.offline.queuedOperations);
    }
    
    clearOfflineQueue() {
        this.offline.queuedOperations = [];
        this.notifyListeners('offline.queuedOperations', this.offline.queuedOperations);
    }
    
    /**
     * Performance monitoring helpers
     */
    startPerformanceMark(label) {
        this.performance.marks.set(label, performance.now());
    }
    
    endPerformanceMark(label) {
        const startTime = this.performance.marks.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.performance.measurements.push({
                label,
                duration,
                timestamp: Date.now()
            });
            this.performance.marks.delete(label);
            return duration;
        }
        return null;
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        this.modals = { active: null, stack: [], transitioning: false };
        this.search = {
            query: '',
            statusFilter: '',
            dateRangeFilter: '',
            sortBy: 'date',
            sortDirection: 'desc',
            lastResults: []
        };
        this.kanban = {
            draggedCard: null,
            draggedApplicationId: null,
            originalStatus: null,
            refreshInterval: null
        };
        this.offline = {
            isOffline: false,
            pendingSync: false,
            queuedOperations: []
        };
        this.notifications = { queue: [], active: 0, maxVisible: 3 };
        
        this.notifyListeners('state.reset', true);
    }
    
    /**
     * Serialize state for debugging
     */
    serialize() {
        return JSON.stringify({
            modals: this.modals,
            search: this.search,
            kanban: this.kanban,
            offline: this.offline,
            ui: this.ui,
            notifications: this.notifications
        }, null, 2);
    }
}

// Create and export global app state instance
export const appState = new AppState();

// Export for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.appState = appState;
}