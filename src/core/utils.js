// Utility functions

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

/**
 * Generates a unique ID
 * @returns {string} Unique identifier
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Safely executes a function with error handling
 * @param {Function} fn - Function to execute
 * @param {*} fallbackValue - Value to return on error
 * @returns {*} Function result or fallback value
 */
export function safeExecute(fn, fallbackValue = null) {
    try {
        return fn();
    } catch (error) {
        console.error('Safe execute error:', error);
        return fallbackValue;
    }
}

/**
 * Formats date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return '';
    
    try {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString();
    } catch {
        return '';
    }
}

/**
 * Formats date for form inputs (YYYY-MM-DD)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateForInput(date) {
    if (!date) return '';
    
    try {
        const dateObj = new Date(date);
        return dateObj.toISOString().split('T')[0];
    } catch {
        return '';
    }
}

/**
 * Capitalizes the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Simple memoization function
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export function memoize(fn) {
    const cache = new Map();
    
    return (...args) => {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Deep clones an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
    constructor() {
        this.marks = new Map();
    }
    
    start(label) {
        this.marks.set(label, performance.now());
    }
    
    end(label) {
        const startTime = this.marks.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            this.marks.delete(label);
            return duration;
        }
        return null;
    }
    
    measure(label, fn) {
        this.start(label);
        const result = fn();
        this.end(label);
        return result;
    }
}

/**
 * Creates a performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();