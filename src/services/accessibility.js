// Comprehensive Accessibility Manager
import { appState } from '../core/state.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { debounce } from '../core/utils.js';

export class AccessibilityManager {
    constructor() {
        this.focusTrappedElements = new Set();
        this.liveRegions = new Map();
        this.keyboardNavigationMap = new Map();
        this.currentFocusIndex = 0;
        this.reducedMotion = false;
        this.highContrast = false;
        
        this.init();
    }
    
    init() {
        this.setupGlobalKeyboardHandlers();
        this.setupFocusManagement();
        this.setupLiveRegions();
        this.setupMotionPreferences();
        this.setupHighContrastMode();
        this.enhanceExistingElements();
        
        console.log('♿ Accessibility Manager initialized');
    }
    
    // Global keyboard navigation
    setupGlobalKeyboardHandlers() {
        document.addEventListener('keydown', this.handleGlobalKeyboard.bind(this));
        
        // Skip links for keyboard users
        this.createSkipLinks();
        
        // Focus outline management
        this.manageFocusOutlines();
    }
    
    handleGlobalKeyboard(event) {
        // Handle escape key globally
        if (event.key === 'Escape') {
            this.handleEscape();
            return;
        }
        
        // Handle keyboard shortcuts with proper modifiers
        if (event.altKey) {
            switch (event.key) {
                case 'h':
                case 'H':
                    event.preventDefault();
                    this.toggleHighContrast();
                    break;
                case 'm':
                case 'M':
                    event.preventDefault();
                    this.toggleReducedMotion();
                    break;
                case '/':
                    event.preventDefault();
                    this.focusSearch();
                    break;
            }
        }
        
        // Tab trap handling
        if (event.key === 'Tab') {
            this.handleTabTrapping(event);
        }
    }
    
    handleEscape() {
        // Close modals
        if (appState.isModalOpen()) {
            import('../ui/ui.js').then(module => {
                module.hideModal();
            });
            return;
        }
        
        // Clear focus traps
        this.clearAllFocusTraps();
        
        // Announce to screen readers
        this.announce('Escaped current context');
    }
    
    // Create skip navigation links
    createSkipLinks() {
        const skipNav = document.createElement('nav');
        skipNav.className = 'skip-navigation';
        skipNav.setAttribute('aria-label', 'Skip navigation links');
        
        const skipLinks = [
            { href: '#main-content', text: 'Skip to main content' },
            { href: '#navigation', text: 'Skip to navigation' },
            { href: '#search', text: 'Skip to search' }
        ];
        
        skipLinks.forEach(link => {
            const a = document.createElement('a');
            a.href = link.href;
            a.className = 'skip-link';
            a.textContent = link.text;
            
            a.addEventListener('focus', () => {
                a.style.transform = 'translateY(0)';
            });
            
            a.addEventListener('blur', () => {
                a.style.transform = 'translateY(-100%)';
            });
            
            skipNav.appendChild(a);
        });
        
        document.body.insertBefore(skipNav, document.body.firstChild);
    }
    
    // Focus outline management (show only when using keyboard)
    manageFocusOutlines() {
        let isUsingKeyboard = false;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                isUsingKeyboard = true;
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            isUsingKeyboard = false;
            document.body.classList.remove('keyboard-navigation');
        });
    }
    
    // Focus management utilities
    setupFocusManagement() {
        // Track focus for restoration
        this.lastFocusedElement = null;
        
        document.addEventListener('focusin', (event) => {
            this.lastFocusedElement = event.target;
        });
    }
    
    // Focus trap for modals and dialogs
    createFocusTrap(container) {
        const focusableSelector = `
            button:not([disabled]),
            [href],
            input:not([disabled]),
            select:not([disabled]),
            textarea:not([disabled]),
            [tabindex]:not([tabindex="-1"]),
            details,
            summary
        `;
        
        const focusableElements = container.querySelectorAll(focusableSelector);
        
        if (focusableElements.length === 0) return null;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const trapFocus = (event) => {
            if (event.key !== 'Tab') return;
            
            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        };
        
        container.addEventListener('keydown', trapFocus);
        this.focusTrappedElements.add(container);
        
        // Focus first element
        firstElement.focus();
        
        return {
            destroy: () => {
                container.removeEventListener('keydown', trapFocus);
                this.focusTrappedElements.delete(container);
            }
        };
    }
    
    handleTabTrapping(event) {
        // Only handle if we're in a trapped context
        if (this.focusTrappedElements.size === 0) return;
        
        for (const container of this.focusTrappedElements) {
            if (container.contains(event.target)) {
                // Focus trap is already handled by createFocusTrap
                return;
            }
        }
    }
    
    clearAllFocusTraps() {
        this.focusTrappedElements.clear();
        
        // Restore focus to last focused element
        if (this.lastFocusedElement && this.lastFocusedElement.focus) {
            this.lastFocusedElement.focus();
        }
    }
    
    // Live regions for dynamic content announcements
    setupLiveRegions() {
        // Create main live region for status updates
        const statusRegion = this.createLiveRegion('status', 'polite');
        this.liveRegions.set('status', statusRegion);
        
        // Create alert region for urgent announcements
        const alertRegion = this.createLiveRegion('alerts', 'assertive');
        this.liveRegions.set('alerts', alertRegion);
        
        // Create log region for application logs
        const logRegion = this.createLiveRegion('log', 'polite');
        logRegion.setAttribute('aria-atomic', 'false');
        this.liveRegions.set('log', logRegion);
    }
    
    createLiveRegion(id, politeness = 'polite') {
        const region = document.createElement('div');
        region.id = `live-region-${id}`;
        region.className = 'sr-only';
        region.setAttribute('aria-live', politeness);
        region.setAttribute('aria-atomic', 'true');
        region.setAttribute('aria-relevant', 'additions text');
        
        document.body.appendChild(region);
        return region;
    }
    
    // Announce messages to screen readers
    announce(message, type = 'status', timeout = 3000) {
        const region = this.liveRegions.get(type);
        if (!region) {
            console.warn(`Live region '${type}' not found`);
            return;
        }
        
        // Clear previous message
        region.textContent = '';
        
        // Add new message with a slight delay to ensure it's announced
        setTimeout(() => {
            region.textContent = message;
            
            // Clear message after timeout to keep region clean
            if (timeout > 0) {
                setTimeout(() => {
                    region.textContent = '';
                }, timeout);
            }
        }, 100);
        
        console.log(`📢 Announced: ${message}`);
    }
    
    // Motion preferences management
    setupMotionPreferences() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.handleMotionPreference(mediaQuery);
        
        mediaQuery.addEventListener('change', this.handleMotionPreference.bind(this));
    }
    
    handleMotionPreference(mediaQuery) {
        this.reducedMotion = mediaQuery.matches;
        appState.setNestedState('ui', 'reducedMotion', this.reducedMotion);
        
        if (this.reducedMotion) {
            document.body.classList.add('reduce-motion');
            this.announce('Reduced motion enabled');
        } else {
            document.body.classList.remove('reduce-motion');
        }
    }
    
    toggleReducedMotion() {
        this.reducedMotion = !this.reducedMotion;
        appState.setNestedState('ui', 'reducedMotion', this.reducedMotion);
        
        document.body.classList.toggle('reduce-motion', this.reducedMotion);
        
        // Store preference
        localStorage.setItem('reducedMotion', this.reducedMotion.toString());
        
        this.announce(
            this.reducedMotion ? 'Reduced motion enabled' : 'Reduced motion disabled'
        );
    }
    
    // High contrast mode management
    setupHighContrastMode() {
        // Load saved preference
        const saved = localStorage.getItem('highContrast') === 'true';
        if (saved) {
            this.enableHighContrast();
        }
    }
    
    toggleHighContrast() {
        if (this.highContrast) {
            this.disableHighContrast();
        } else {
            this.enableHighContrast();
        }
    }
    
    enableHighContrast() {
        this.highContrast = true;
        document.body.classList.add('high-contrast');
        appState.setNestedState('ui', 'highContrast', true);
        
        // Update button state
        const button = document.getElementById('high-contrast-btn');
        if (button) {
            button.setAttribute('aria-pressed', 'true');
            button.title = 'Disable high contrast';
        }
        
        // Store preference
        localStorage.setItem('highContrast', 'true');
        
        this.announce('High contrast mode enabled');
        
        // Emit event
        eventBus.emit(EVENTS.THEME_CHANGED, { highContrast: true });
    }
    
    disableHighContrast() {
        this.highContrast = false;
        document.body.classList.remove('high-contrast');
        appState.setNestedState('ui', 'highContrast', false);
        
        // Update button state
        const button = document.getElementById('high-contrast-btn');
        if (button) {
            button.setAttribute('aria-pressed', 'false');
            button.title = 'Enable high contrast';
        }
        
        // Store preference
        localStorage.setItem('highContrast', 'false');
        
        this.announce('High contrast mode disabled');
        
        // Emit event
        eventBus.emit(EVENTS.THEME_CHANGED, { highContrast: false });
    }
    
    // Focus search functionality
    focusSearch() {
        const searchInput = document.getElementById('searchInput') || 
                           document.querySelector('input[type="search"]') ||
                           document.querySelector('input[placeholder*="search" i]');
        
        if (searchInput) {
            searchInput.focus();
            this.announce('Search field focused');
        }
    }
    
    // Enhance existing elements with accessibility features
    enhanceExistingElements() {
        this.enhanceButtons();
        this.enhanceForms();
        this.enhanceImages();
        this.enhanceTables();
        this.enhanceCards();
    }
    
    enhanceButtons() {
        const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        
        buttons.forEach(button => {
            // Add accessible names for icon-only buttons
            if (button.textContent.trim() === '' || /^[^\w\s]+$/.test(button.textContent.trim())) {
                const title = button.title || button.className;
                if (title) {
                    button.setAttribute('aria-label', title);
                }
            }
            
            // Add button state management
            if (button.classList.contains('toggle')) {
                button.setAttribute('aria-pressed', 'false');
                
                button.addEventListener('click', () => {
                    const pressed = button.getAttribute('aria-pressed') === 'true';
                    button.setAttribute('aria-pressed', (!pressed).toString());
                });
            }
        });
    }
    
    enhanceForms() {
        // Enhance form labels and descriptions
        const inputs = document.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Link to labels
            if (!input.getAttribute('aria-labelledby') && !input.getAttribute('aria-label')) {
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) {
                    input.setAttribute('aria-labelledby', label.id || `label-${input.id}`);
                    if (!label.id) label.id = `label-${input.id}`;
                }
            }
            
            // Link to error messages
            const errorElement = document.querySelector(`[data-error-for="${input.id}"]`);
            if (errorElement) {
                input.setAttribute('aria-describedby', errorElement.id || `error-${input.id}`);
                if (!errorElement.id) errorElement.id = `error-${input.id}`;
            }
            
            // Required field indicators
            if (input.hasAttribute('required')) {
                input.setAttribute('aria-required', 'true');
            }
        });
    }
    
    enhanceImages() {
        const images = document.querySelectorAll('img:not([alt])');
        
        images.forEach(img => {
            // Add empty alt for decorative images
            if (img.closest('.decorative') || img.classList.contains('decorative')) {
                img.setAttribute('alt', '');
            } else {
                // Warn about missing alt text
                console.warn('Image missing alt text:', img.src);
                img.setAttribute('alt', 'Image'); // Fallback
            }
        });
    }
    
    enhanceTables() {
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            // Add table caption if missing
            if (!table.querySelector('caption')) {
                const caption = document.createElement('caption');
                caption.textContent = 'Data table';
                caption.className = 'sr-only';
                table.insertBefore(caption, table.firstChild);
            }
            
            // Enhance headers
            const headers = table.querySelectorAll('th');
            headers.forEach((th, index) => {
                if (!th.getAttribute('scope')) {
                    th.setAttribute('scope', index === 0 ? 'row' : 'col');
                }
            });
        });
    }
    
    enhanceCards() {
        const cards = document.querySelectorAll('.card, .application-card, .kanban-card');
        
        cards.forEach(card => {
            // Make cards focusable
            if (!card.hasAttribute('tabindex')) {
                card.setAttribute('tabindex', '0');
            }
            
            // Add role if missing
            if (!card.getAttribute('role')) {
                card.setAttribute('role', 'article');
            }
            
            // Add accessible name
            const title = card.querySelector('h1, h2, h3, h4, h5, h6');
            if (title && !card.getAttribute('aria-labelledby')) {
                if (!title.id) title.id = `card-title-${Math.random().toString(36).substr(2, 9)}`;
                card.setAttribute('aria-labelledby', title.id);
            }
        });
    }
    
    // Keyboard navigation for custom components
    setupKeyboardNavigation(container, options = {}) {
        const {
            selector = '[tabindex="0"], button, a, input, select, textarea',
            wrap = true,
            direction = 'both' // 'horizontal', 'vertical', 'both'
        } = options;
        
        const elements = Array.from(container.querySelectorAll(selector));
        if (elements.length === 0) return null;
        
        const handleKeyboard = (event) => {
            const currentIndex = elements.indexOf(event.target);
            if (currentIndex === -1) return;
            
            let nextIndex = currentIndex;
            
            switch (event.key) {
                case 'ArrowDown':
                    if (direction === 'vertical' || direction === 'both') {
                        event.preventDefault();
                        nextIndex = wrap ? (currentIndex + 1) % elements.length : 
                                          Math.min(currentIndex + 1, elements.length - 1);
                    }
                    break;
                    
                case 'ArrowUp':
                    if (direction === 'vertical' || direction === 'both') {
                        event.preventDefault();
                        nextIndex = wrap ? (currentIndex - 1 + elements.length) % elements.length : 
                                          Math.max(currentIndex - 1, 0);
                    }
                    break;
                    
                case 'ArrowRight':
                    if (direction === 'horizontal' || direction === 'both') {
                        event.preventDefault();
                        nextIndex = wrap ? (currentIndex + 1) % elements.length : 
                                          Math.min(currentIndex + 1, elements.length - 1);
                    }
                    break;
                    
                case 'ArrowLeft':
                    if (direction === 'horizontal' || direction === 'both') {
                        event.preventDefault();
                        nextIndex = wrap ? (currentIndex - 1 + elements.length) % elements.length : 
                                          Math.max(currentIndex - 1, 0);
                    }
                    break;
                    
                case 'Home':
                    event.preventDefault();
                    nextIndex = 0;
                    break;
                    
                case 'End':
                    event.preventDefault();
                    nextIndex = elements.length - 1;
                    break;
            }
            
            if (nextIndex !== currentIndex) {
                elements[nextIndex].focus();
            }
        };
        
        container.addEventListener('keydown', handleKeyboard);
        this.keyboardNavigationMap.set(container, handleKeyboard);
        
        return {
            destroy: () => {
                container.removeEventListener('keydown', handleKeyboard);
                this.keyboardNavigationMap.delete(container);
            }
        };
    }
    
    // Test accessibility features
    runAccessibilityAudit() {
        const issues = [];
        
        // Check for missing alt text
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
        if (imagesWithoutAlt.length > 0) {
            issues.push(`${imagesWithoutAlt.length} images missing alt text`);
        }
        
        // Check for missing form labels
        const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        if (inputsWithoutLabels.length > 0) {
            issues.push(`${inputsWithoutLabels.length} form inputs missing labels`);
        }
        
        // Check for missing headings
        const h1s = document.querySelectorAll('h1');
        if (h1s.length === 0) {
            issues.push('No h1 heading found');
        } else if (h1s.length > 1) {
            issues.push(`Multiple h1 headings found (${h1s.length})`);
        }
        
        // Check for missing main landmark
        const main = document.querySelector('main, [role="main"]');
        if (!main) {
            issues.push('No main landmark found');
        }
        
        // Check for keyboard focus indicators
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        // Check color contrast (basic check)
        const contrastIssues = this.checkBasicContrast();
        issues.push(...contrastIssues);
        
        return issues;
    }
    
    checkBasicContrast() {
        const issues = [];
        
        // This is a simplified contrast check
        // In a real application, you'd use a more comprehensive tool
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
        
        textElements.forEach(element => {
            const style = window.getComputedStyle(element);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            
            // Simple check for black text on white background
            if (color === 'rgb(0, 0, 0)' && backgroundColor === 'rgba(0, 0, 0, 0)') {
                // This might be an issue, but would need more sophisticated checking
            }
        });
        
        return issues;
    }
    
    // Generate accessibility report
    generateReport() {
        const issues = this.runAccessibilityAudit();
        
        const report = {
            timestamp: new Date().toISOString(),
            issues: issues,
            issueCount: issues.length,
            highContrast: this.highContrast,
            reducedMotion: this.reducedMotion,
            focusTraps: this.focusTrappedElements.size,
            liveRegions: this.liveRegions.size
        };
        
        console.log('♿ Accessibility Report:', report);
        return report;
    }
}

// Create global accessibility manager instance
export const accessibilityManager = new AccessibilityManager();

// Make available globally for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.accessibilityManager = accessibilityManager;
}