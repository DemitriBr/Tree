// Lazy Loading Service for Performance Optimization
import { performanceMonitor } from './performanceMonitor.js';

class LazyLoader {
    constructor() {
        this.observers = new Map();
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        
        this.setupImageLazyLoading();
    }
    
    // Lazy load ES6 modules
    async loadModule(modulePath, retries = 3) {
        // Return cached module if already loaded
        if (this.loadedModules.has(modulePath)) {
            return this.loadedModules.get(modulePath);
        }
        
        // Return existing promise if module is currently loading
        if (this.loadingPromises.has(modulePath)) {
            return this.loadingPromises.get(modulePath);
        }
        
        const loadPromise = this.performModuleLoad(modulePath, retries);
        this.loadingPromises.set(modulePath, loadPromise);
        
        try {
            const module = await loadPromise;
            this.loadedModules.set(modulePath, module);
            this.loadingPromises.delete(modulePath);
            return module;
        } catch (error) {
            this.loadingPromises.delete(modulePath);
            throw error;
        }
    }
    
    async performModuleLoad(modulePath, retries) {
        const label = `load-module-${modulePath.split('/').pop()}`;
        
        return performanceMonitor.measure(label, async () => {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    console.log(`📦 Loading module: ${modulePath} (attempt ${attempt})`);
                    
                    const module = await import(modulePath);
                    
                    console.log(`✅ Module loaded: ${modulePath}`);
                    return module;
                    
                } catch (error) {
                    console.error(`❌ Failed to load module ${modulePath} (attempt ${attempt}):`, error);
                    
                    if (attempt === retries) {
                        throw new Error(`Failed to load module ${modulePath} after ${retries} attempts: ${error.message}`);
                    }
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                }
            }
        });
    }
    
    // Lazy load view modules
    async loadView(viewName) {
        const viewModules = {
            list: '../views/listView.js',
            dashboard: '../views/dashboardView.js',
            kanban: '../views/kanbanview.js'
        };
        
        const modulePath = viewModules[viewName];
        if (!modulePath) {
            throw new Error(`Unknown view: ${viewName}`);
        }
        
        return this.loadModule(modulePath);
    }
    
    // Lazy load feature modules
    async loadFeature(featureName) {
        const featureModules = {
            interviews: '../features/interviews.js',
            contacts: '../features/contacts.js',
            documents: '../features/documents.js',
            importExport: '../features/importExport.js',
            backup: '../features/backup.js'
        };
        
        const modulePath = featureModules[featureName];
        if (!modulePath) {
            throw new Error(`Unknown feature: ${featureName}`);
        }
        
        return this.loadModule(modulePath);
    }
    
    // Setup image lazy loading
    setupImageLazyLoading() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    imageObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });
        
        this.observers.set('images', imageObserver);
    }
    
    // Load individual image
    loadImage(img) {
        performanceMonitor.start('load-image');
        
        const src = img.dataset.src;
        if (!src) return;
        
        // Create new image element for preloading
        const imageLoader = new Image();
        
        imageLoader.onload = () => {
            // Image loaded successfully
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.remove('lazy');
            img.classList.add('loaded');
            
            performanceMonitor.end('load-image');
        };
        
        imageLoader.onerror = () => {
            // Image failed to load
            img.classList.add('error');
            img.alt = 'Failed to load image';
            
            performanceMonitor.end('load-image');
            console.error('Failed to load image:', src);
        };
        
        imageLoader.src = src;
    }
    
    // Observe images for lazy loading
    observeImages(container = document) {
        const images = container.querySelectorAll('img[data-src]');
        const observer = this.observers.get('images');
        
        images.forEach(img => {
            observer.observe(img);
        });
        
        return images.length;
    }
    
    // Lazy load content sections
    observeContent(elements, callback, options = {}) {
        const contentObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    performanceMonitor.measure('lazy-content-load', () => {
                        callback(entry.target);
                    });
                    
                    if (!options.repeat) {
                        contentObserver.unobserve(entry.target);
                    }
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.1,
            ...options
        });
        
        elements.forEach(element => {
            contentObserver.observe(element);
        });
        
        return contentObserver;
    }
    
    // Preload critical modules
    async preloadCriticalModules() {
        const criticalModules = [
            '../ui/ui.js',
            '../ui/formHandler.js',
            '../core/db.js'
        ];
        
        console.log('🚀 Preloading critical modules...');
        
        const promises = criticalModules.map(module => 
            this.loadModule(module).catch(error => {
                console.error(`Failed to preload ${module}:`, error);
                return null;
            })
        );
        
        await Promise.allSettled(promises);
        console.log('✅ Critical modules preloaded');
    }
    
    // Preload modules based on user behavior
    async preloadOnHover(element, modulePath) {
        let preloadPromise = null;
        
        const preload = () => {
            if (!preloadPromise) {
                preloadPromise = this.loadModule(modulePath);
            }
        };
        
        element.addEventListener('mouseenter', preload, { once: true });
        element.addEventListener('focus', preload, { once: true });
        
        // Cleanup
        return () => {
            element.removeEventListener('mouseenter', preload);
            element.removeEventListener('focus', preload);
        };
    }
    
    // Preload modules on idle
    preloadOnIdle(modules) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                modules.forEach(module => {
                    this.loadModule(module).catch(error => {
                        console.warn(`Idle preload failed for ${module}:`, error);
                    });
                });
            });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
                modules.forEach(module => {
                    this.loadModule(module).catch(error => {
                        console.warn(`Idle preload failed for ${module}:`, error);
                    });
                });
            }, 2000);
        }
    }
    
    // Get loading statistics
    getStats() {
        return {
            loadedModules: this.loadedModules.size,
            currentlyLoading: this.loadingPromises.size,
            moduleList: Array.from(this.loadedModules.keys())
        };
    }
    
    // Clear cache
    clearCache() {
        this.loadedModules.clear();
        this.loadingPromises.clear();
    }
    
    // Disconnect all observers
    disconnect() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// Create global lazy loader instance
export const lazyLoader = new LazyLoader();

// Utility functions for common lazy loading patterns
export const lazyLoadUtils = {
    // Lazy load a component when it becomes visible
    lazyComponent(element, factory) {
        return lazyLoader.observeContent([element], async (el) => {
            try {
                const component = await factory();
                if (component && typeof component.render === 'function') {
                    component.render(el);
                }
            } catch (error) {
                console.error('Failed to lazy load component:', error);
                el.innerHTML = '<div class="error">Failed to load component</div>';
            }
        });
    },
    
    // Lazy load and execute a function
    lazyFunction(trigger, factory) {
        let loaded = false;
        
        const load = async () => {
            if (loaded) return;
            loaded = true;
            
            try {
                const fn = await factory();
                if (typeof fn === 'function') {
                    fn();
                }
            } catch (error) {
                console.error('Failed to lazy load function:', error);
                loaded = false; // Allow retry
            }
        };
        
        trigger.addEventListener('click', load, { once: true });
        return load;
    },
    
    // Create a lazy-loaded route handler
    lazyRoute(path, moduleFactory) {
        return {
            path,
            handler: async () => {
                try {
                    const module = await moduleFactory();
                    return module.default || module;
                } catch (error) {
                    console.error(`Failed to load route ${path}:`, error);
                    throw error;
                }
            }
        };
    },
    
    // Lazy load external libraries
    async lazyScript(src, globalName = null) {
        // Check if already loaded
        if (globalName && window[globalName]) {
            return window[globalName];
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
                const result = globalName ? window[globalName] : true;
                resolve(result);
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    }
};

// Auto-setup for common scenarios
document.addEventListener('DOMContentLoaded', () => {
    // Auto-observe images
    lazyLoader.observeImages();
    
    // Preload critical modules
    lazyLoader.preloadCriticalModules();
    
    // Setup hover preloading for navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        const viewName = button.getAttribute('data-view');
        if (viewName && viewName !== 'home') {
            lazyLoader.preloadOnHover(button, `../views/${viewName}View.js`);
        }
    });
    
    // Preload non-critical modules on idle
    lazyLoader.preloadOnIdle([
        '../features/interviews.js',
        '../features/contacts.js',
        '../features/documents.js'
    ]);
});

// Make available globally for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.lazyLoader = lazyLoader;
}