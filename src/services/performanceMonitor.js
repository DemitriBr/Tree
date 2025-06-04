// Advanced Performance Monitoring Service
import { eventBus, EVENTS } from '../core/eventBus.js';

class AdvancedPerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.memoryThreshold = 50 * 1024 * 1024; // 50MB
        this.isMonitoring = false;
        this.reportInterval = null;
        
        this.setupObservers();
        this.startMonitoring();
    }
    
    setupObservers() {
        // Performance Observer for measuring timing
        if ('PerformanceObserver' in window) {
            const perfObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordMetric(entry.name, {
                        type: entry.entryType,
                        duration: entry.duration,
                        startTime: entry.startTime,
                        timestamp: Date.now()
                    });
                }
            });
            
            perfObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
            this.observers.set('performance', perfObserver);
        }
        
        // Long Task Observer for detecting blocking operations
        if ('PerformanceObserver' in window) {
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordLongTask(entry);
                        
                        // Emit warning for long tasks
                        eventBus.emit(EVENTS.PERFORMANCE_MARK, {
                            type: 'long-task',
                            duration: entry.duration,
                            startTime: entry.startTime
                        });
                        
                        console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
                    }
                });
                
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.set('longtask', longTaskObserver);
            } catch (e) {
                console.warn('Long task observer not supported');
            }
        }
        
        // Layout Shift Observer
        if ('PerformanceObserver' in window) {
            try {
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            this.recordLayoutShift(entry);
                        }
                    }
                });
                
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.set('layout-shift', clsObserver);
            } catch (e) {
                console.warn('Layout shift observer not supported');
            }
        }
    }
    
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // Monitor memory usage every 30 seconds
        this.reportInterval = setInterval(() => {
            this.checkMemoryUsage();
            this.generatePerformanceReport();
        }, 30000);
        
        // Monitor FPS
        this.startFPSMonitoring();
        
        // Monitor bundle size and load times
        this.monitorResourceLoading();
    }
    
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
        }
        
        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
    
    // Enhanced timing measurement
    start(label) {
        const startTime = performance.now();
        this.metrics.set(`${label}_start`, startTime);
        
        // Use Performance API for more accurate measurements
        performance.mark(`${label}-start`);
        
        return startTime;
    }
    
    end(label) {
        const endTime = performance.now();
        const startTime = this.metrics.get(`${label}_start`);
        
        if (startTime) {
            const duration = endTime - startTime;
            
            // Use Performance API
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);
            
            this.recordMetric(label, {
                type: 'custom-timing',
                duration,
                startTime,
                endTime,
                timestamp: Date.now()
            });
            
            // Cleanup
            this.metrics.delete(`${label}_start`);
            
            // Log slow operations
            if (duration > 100) {
                console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
            }
            
            return duration;
        }
        
        return null;
    }
    
    // Measure function execution time
    measure(label, fn) {
        this.start(label);
        
        if (fn.constructor.name === 'AsyncFunction') {
            return fn().finally(() => this.end(label));
        } else {
            try {
                const result = fn();
                this.end(label);
                return result;
            } catch (error) {
                this.end(label);
                throw error;
            }
        }
    }
    
    // Record custom metrics
    recordMetric(name, data) {
        if (!this.metrics.has('custom-metrics')) {
            this.metrics.set('custom-metrics', []);
        }
        
        const metrics = this.metrics.get('custom-metrics');
        metrics.push({
            name,
            ...data,
            timestamp: Date.now()
        });
        
        // Keep only last 100 metrics
        if (metrics.length > 100) {
            metrics.splice(0, metrics.length - 100);
        }
    }
    
    // Monitor memory usage
    checkMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const usage = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
            
            this.recordMetric('memory-usage', usage);
            
            // Warn if memory usage is high
            if (usage.used > this.memoryThreshold) {
                console.warn(`High memory usage detected: ${(usage.used / 1024 / 1024).toFixed(2)}MB`);
                
                eventBus.emit(EVENTS.PERFORMANCE_MARK, {
                    type: 'high-memory',
                    usage: usage.used,
                    limit: usage.limit
                });
            }
        }
    }
    
    // Monitor FPS
    startFPSMonitoring() {
        let lastTime = performance.now();
        let frames = 0;
        
        const measureFPS = (currentTime) => {
            frames++;
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                
                this.recordMetric('fps', {
                    type: 'fps',
                    value: fps,
                    timestamp: Date.now()
                });
                
                // Warn if FPS is low
                if (fps < 30) {
                    console.warn(`Low FPS detected: ${fps}fps`);
                }
                
                frames = 0;
                lastTime = currentTime;
            }
            
            if (this.isMonitoring) {
                requestAnimationFrame(measureFPS);
            }
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    // Monitor resource loading
    monitorResourceLoading() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
                    this.recordMetric('resource-load', {
                        type: 'resource',
                        name: entry.name,
                        duration: entry.duration,
                        transferSize: entry.transferSize,
                        encodedBodySize: entry.encodedBodySize,
                        decodedBodySize: entry.decodedBodySize,
                        timestamp: Date.now()
                    });
                    
                    // Warn about large resources
                    if (entry.transferSize > 500 * 1024) { // 500KB
                        console.warn(`Large resource loaded: ${entry.name} (${(entry.transferSize / 1024).toFixed(2)}KB)`);
                    }
                }
            }
        });
        
        observer.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', observer);
    }
    
    // Record long tasks
    recordLongTask(entry) {
        this.recordMetric('long-task', {
            type: 'longtask',
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
            timestamp: Date.now()
        });
    }
    
    // Record layout shifts
    recordLayoutShift(entry) {
        this.recordMetric('layout-shift', {
            type: 'layout-shift',
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
            timestamp: Date.now()
        });
    }
    
    // Generate performance report
    generatePerformanceReport() {
        const report = {
            timestamp: Date.now(),
            memory: this.getMemoryMetrics(),
            timing: this.getTimingMetrics(),
            fps: this.getFPSMetrics(),
            longTasks: this.getLongTaskMetrics(),
            layoutShifts: this.getLayoutShiftMetrics(),
            resources: this.getResourceMetrics()
        };
        
        // Store report
        this.storeReport(report);
        
        return report;
    }
    
    // Get memory metrics
    getMemoryMetrics() {
        const memoryMetrics = this.getMetricsByType('memory-usage');
        if (memoryMetrics.length === 0) return null;
        
        const latest = memoryMetrics[memoryMetrics.length - 1];
        return {
            current: latest.used,
            peak: Math.max(...memoryMetrics.map(m => m.used)),
            average: memoryMetrics.reduce((sum, m) => sum + m.used, 0) / memoryMetrics.length
        };
    }
    
    // Get timing metrics
    getTimingMetrics() {
        const timingMetrics = this.getMetricsByType('custom-timing');
        
        const grouped = {};
        timingMetrics.forEach(metric => {
            if (!grouped[metric.name]) {
                grouped[metric.name] = [];
            }
            grouped[metric.name].push(metric.duration);
        });
        
        const summary = {};
        Object.keys(grouped).forEach(name => {
            const durations = grouped[name];
            summary[name] = {
                count: durations.length,
                average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
                min: Math.min(...durations),
                max: Math.max(...durations)
            };
        });
        
        return summary;
    }
    
    // Get FPS metrics
    getFPSMetrics() {
        const fpsMetrics = this.getMetricsByType('fps');
        if (fpsMetrics.length === 0) return null;
        
        const values = fpsMetrics.map(m => m.value);
        return {
            current: values[values.length - 1],
            average: values.reduce((sum, v) => sum + v, 0) / values.length,
            min: Math.min(...values)
        };
    }
    
    // Get long task metrics
    getLongTaskMetrics() {
        const longTasks = this.getMetricsByType('longtask');
        
        return {
            count: longTasks.length,
            totalDuration: longTasks.reduce((sum, task) => sum + task.duration, 0),
            averageDuration: longTasks.length > 0 
                ? longTasks.reduce((sum, task) => sum + task.duration, 0) / longTasks.length 
                : 0
        };
    }
    
    // Get layout shift metrics
    getLayoutShiftMetrics() {
        const shifts = this.getMetricsByType('layout-shift');
        
        return {
            count: shifts.length,
            totalScore: shifts.reduce((sum, shift) => sum + shift.value, 0)
        };
    }
    
    // Get resource metrics
    getResourceMetrics() {
        const resources = this.getMetricsByType('resource');
        
        return {
            count: resources.length,
            totalSize: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
            averageLoadTime: resources.length > 0 
                ? resources.reduce((sum, resource) => sum + resource.duration, 0) / resources.length 
                : 0
        };
    }
    
    // Helper to get metrics by type
    getMetricsByType(type) {
        const customMetrics = this.metrics.get('custom-metrics') || [];
        return customMetrics.filter(metric => metric.type === type);
    }
    
    // Store performance report
    storeReport(report) {
        const reports = JSON.parse(localStorage.getItem('performance-reports') || '[]');
        reports.push(report);
        
        // Keep only last 10 reports
        if (reports.length > 10) {
            reports.splice(0, reports.length - 10);
        }
        
        localStorage.setItem('performance-reports', JSON.stringify(reports));
    }
    
    // Get stored reports
    getStoredReports() {
        return JSON.parse(localStorage.getItem('performance-reports') || '[]');
    }
    
    // Clear all metrics
    clear() {
        this.metrics.clear();
        localStorage.removeItem('performance-reports');
    }
    
    // Export metrics for debugging
    exportMetrics() {
        return {
            metrics: Object.fromEntries(this.metrics),
            reports: this.getStoredReports()
        };
    }
}

// Create global performance monitor instance
export const performanceMonitor = new AdvancedPerformanceMonitor();

// Make available globally for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.performanceMonitor = performanceMonitor;
}

// Performance utilities
export const performanceUtils = {
    // Debounce with performance tracking
    debounce(func, delay, label = 'debounced-function') {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                performanceMonitor.measure(label, () => func.apply(this, args));
            }, delay);
        };
    },
    
    // Throttle with performance tracking
    throttle(func, limit, label = 'throttled-function') {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                performanceMonitor.measure(label, () => func.apply(this, args));
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Batch DOM operations
    batchDOMUpdates(operations) {
        return performanceMonitor.measure('batch-dom-updates', () => {
            const fragment = document.createDocumentFragment();
            
            operations.forEach(operation => {
                if (typeof operation === 'function') {
                    operation(fragment);
                }
            });
            
            return fragment;
        });
    },
    
    // Lazy load with Intersection Observer
    lazyLoad(elements, callback, options = {}) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    performanceMonitor.measure('lazy-load-callback', () => {
                        callback(entry.target);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, ...options });
        
        elements.forEach(el => observer.observe(el));
        
        return observer;
    },
    
    // Optimize animations
    optimizeAnimation(element, keyframes, options = {}) {
        // Prefer transform and opacity for better performance
        const optimizedKeyframes = keyframes.map(frame => {
            const optimized = { ...frame };
            
            // Convert position changes to transforms
            if (frame.left !== undefined || frame.top !== undefined) {
                const x = frame.left || 0;
                const y = frame.top || 0;
                optimized.transform = `translate(${x}px, ${y}px)`;
                delete optimized.left;
                delete optimized.top;
            }
            
            return optimized;
        });
        
        return element.animate(optimizedKeyframes, {
            duration: 300,
            easing: 'ease-out',
            fill: 'forwards',
            ...options
        });
    }
};