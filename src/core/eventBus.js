// Event bus for inter-module communication

/**
 * Simple event bus for decoupled communication between modules
 */
export class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.debug = false;
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventName - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        this.events.get(eventName).push(callback);
        
        if (this.debug) {
            console.log(`📡 Event listener added: ${eventName}`);
        }
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }
    
    /**
     * Subscribe to an event (once only)
     * @param {string} eventName - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback) {
        if (!this.onceEvents.has(eventName)) {
            this.onceEvents.set(eventName, []);
        }
        
        this.onceEvents.get(eventName).push(callback);
        
        if (this.debug) {
            console.log(`📡 One-time event listener added: ${eventName}`);
        }
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.onceEvents.get(eventName);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(eventName, callback) {
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
                
                if (this.debug) {
                    console.log(`📡 Event listener removed: ${eventName}`);
                }
            }
        }
    }
    
    /**
     * Emit an event
     * @param {string} eventName - Event name
     * @param {*} data - Data to pass to listeners
     */
    emit(eventName, data = null) {
        if (this.debug) {
            console.log(`📡 Event emitted: ${eventName}`, data);
        }
        
        // Handle regular listeners
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data, eventName);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
        
        // Handle once listeners
        const onceCallbacks = this.onceEvents.get(eventName);
        if (onceCallbacks) {
            // Execute all once callbacks
            onceCallbacks.forEach(callback => {
                try {
                    callback(data, eventName);
                } catch (error) {
                    console.error(`Error in once event listener for ${eventName}:`, error);
                }
            });
            
            // Clear once listeners after execution
            this.onceEvents.delete(eventName);
        }
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} eventName - Event name
     */
    removeAllListeners(eventName) {
        this.events.delete(eventName);
        this.onceEvents.delete(eventName);
        
        if (this.debug) {
            console.log(`📡 All listeners removed for: ${eventName}`);
        }
    }
    
    /**
     * Remove all listeners for all events
     */
    clear() {
        this.events.clear();
        this.onceEvents.clear();
        
        if (this.debug) {
            console.log(`📡 All event listeners cleared`);
        }
    }
    
    /**
     * Get list of events with listeners
     * @returns {Array} Array of event names
     */
    getEvents() {
        const regularEvents = Array.from(this.events.keys());
        const onceEvents = Array.from(this.onceEvents.keys());
        return [...new Set([...regularEvents, ...onceEvents])];
    }
    
    /**
     * Get listener count for an event
     * @param {string} eventName - Event name
     * @returns {number} Number of listeners
     */
    getListenerCount(eventName) {
        const regular = this.events.get(eventName)?.length || 0;
        const once = this.onceEvents.get(eventName)?.length || 0;
        return regular + once;
    }
    
    /**
     * Enable/disable debug logging
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`📡 Event bus debug mode: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        const info = {
            totalEvents: this.getEvents().length,
            events: {}
        };
        
        this.getEvents().forEach(eventName => {
            info.events[eventName] = {
                regularListeners: this.events.get(eventName)?.length || 0,
                onceListeners: this.onceEvents.get(eventName)?.length || 0
            };
        });
        
        return info;
    }
}

// Create and export global event bus instance
export const eventBus = new EventBus();

// Common event names
export const EVENTS = {
    // Database events
    DB_INITIALIZED: 'db:initialized',
    APPLICATION_ADDED: 'application:added',
    APPLICATION_UPDATED: 'application:updated',
    APPLICATION_DELETED: 'application:deleted',
    
    // UI events
    VIEW_CHANGED: 'ui:viewChanged',
    THEME_CHANGED: 'ui:themeChanged',
    MODAL_OPENED: 'ui:modalOpened',
    MODAL_CLOSED: 'ui:modalClosed',
    
    // Search/Filter events
    SEARCH_UPDATED: 'search:updated',
    FILTERS_CHANGED: 'filters:changed',
    FILTERS_CLEARED: 'filters:cleared',
    
    // Kanban events
    CARD_DRAG_START: 'kanban:dragStart',
    CARD_DRAG_END: 'kanban:dragEnd',
    CARD_MOVED: 'kanban:cardMoved',
    
    // Notification events
    NOTIFICATION_SHOW: 'notification:show',
    NOTIFICATION_HIDE: 'notification:hide',
    
    // Offline events
    OFFLINE_STATUS_CHANGED: 'offline:statusChanged',
    SYNC_COMPLETED: 'offline:syncCompleted',
    
    // Performance events
    PERFORMANCE_MARK: 'performance:mark',
    
    // Error events
    ERROR_OCCURRED: 'error:occurred',
    
    // Feature events
    INTERVIEW_ADDED: 'interview:added',
    CONTACT_ADDED: 'contact:added',
    DOCUMENT_ADDED: 'document:added'
};

// Enable debug mode in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    eventBus.setDebug(true);
    window.eventBus = eventBus;
    window.EVENTS = EVENTS;
}