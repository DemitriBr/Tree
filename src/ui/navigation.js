// Navigation and view management
import { appState } from '../core/state.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { VIEW_NAMES } from '../core/config.js';

/**
 * Set up navigation system
 */
export function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const viewName = button.getAttribute('data-view');
            if (viewName) {
                switchView(viewName);
            }
        });
    });
    
    // Set up keyboard navigation
    setupKeyboardNavigation();
    
    // Set up dark mode toggle
    setupDarkModeToggle();
    
    console.log('Navigation system initialized');
}

/**
 * Switch to a different view
 * @param {string} viewName - Name of the view to switch to
 */
export function switchView(viewName) {
    const previousView = appState.ui.currentView;
    
    // Validate view name
    if (!Object.values(VIEW_NAMES).includes(viewName)) {
        console.error('Invalid view name:', viewName);
        return;
    }
    
    // Update state
    const oldView = appState.switchView(viewName);
    
    // Update UI
    updateViewDisplay(viewName, oldView);
    updateNavigation(viewName);
    
    // Emit event
    eventBus.emit(EVENTS.VIEW_CHANGED, { 
        currentView: viewName, 
        previousView: oldView 
    });
    
    console.log(`Switched from ${oldView} to ${viewName} view`);
}

/**
 * Update view display in the DOM
 * @param {string} currentView - Current view name
 * @param {string} previousView - Previous view name
 */
function updateViewDisplay(currentView, previousView) {
    // Hide all views
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(view => {
        view.classList.remove('active');
    });
    
    // Show current view
    const currentViewElement = document.getElementById(`${currentView}View`);
    if (currentViewElement) {
        currentViewElement.classList.add('active');
        
        // Focus management for accessibility
        const firstFocusable = currentViewElement.querySelector('h1, h2, button, input, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    } else {
        console.error(`View element not found: ${currentView}View`);
    }
    
    // Trigger view-specific initialization
    initializeViewContent(currentView);
}

/**
 * Update navigation button states
 * @param {string} currentView - Current view name
 */
function updateNavigation(currentView) {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        const viewName = button.getAttribute('data-view');
        
        if (viewName === currentView) {
            button.classList.add('active');
            button.setAttribute('aria-current', 'page');
        } else {
            button.classList.remove('active');
            button.removeAttribute('aria-current');
        }
    });
}

/**
 * Initialize content for specific views
 * @param {string} viewName - View name
 */
function initializeViewContent(viewName) {
    switch (viewName) {
        case VIEW_NAMES.LIST:
            // Import and render list view if not already done
            import('../views/listView.js').then(module => {
                if (module.renderApplicationsList) {
                    module.renderApplicationsList();
                }
            }).catch(console.error);
            break;
            
        case VIEW_NAMES.DASHBOARD:
            // Import and render dashboard if not already done
            import('../views/dashboardView.js').then(module => {
                if (module.renderDashboard) {
                    module.renderDashboard();
                }
            }).catch(console.error);
            break;
            
        case VIEW_NAMES.KANBAN:
            // Import and render kanban board if not already done
            import('../views/kanbanview.js').then(module => {
                if (module.renderKanbanBoard) {
                    module.renderKanbanBoard();
                }
            }).catch(console.error);
            break;
            
        case VIEW_NAMES.HOME:
            // Home view is always available, no special initialization needed
            break;
            
        default:
            console.warn('Unknown view for initialization:', viewName);
    }
}

/**
 * Set up keyboard navigation shortcuts
 */
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        // Only handle keyboard shortcuts if no modal is open and no input is focused
        if (appState.isModalOpen() || 
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
            return;
        }
        
        // Handle navigation shortcuts
        if (event.altKey) {
            switch (event.key) {
                case '1':
                    event.preventDefault();
                    switchView(VIEW_NAMES.HOME);
                    break;
                case '2':
                    event.preventDefault();
                    switchView(VIEW_NAMES.LIST);
                    break;
                case '3':
                    event.preventDefault();
                    switchView(VIEW_NAMES.DASHBOARD);
                    break;
                case '4':
                    event.preventDefault();
                    switchView(VIEW_NAMES.KANBAN);
                    break;
            }
        }
        
        // Handle arrow key navigation within nav buttons
        if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            const focusedElement = document.activeElement;
            if (focusedElement && focusedElement.classList.contains('nav-btn')) {
                event.preventDefault();
                navigateNavButtons(event.key === 'ArrowRight' ? 1 : -1);
            }
        }
    });
}

/**
 * Navigate between nav buttons with arrow keys
 * @param {number} direction - 1 for next, -1 for previous
 */
function navigateNavButtons(direction) {
    const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    const currentIndex = navButtons.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + direction + navButtons.length) % navButtons.length;
    navButtons[nextIndex].focus();
}

/**
 * Set up dark mode toggle functionality
 */
function setupDarkModeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            toggleDarkMode();
        });
        
        // Initialize theme from localStorage or system preference
        initializeTheme();
    }
}

/**
 * Toggle dark mode
 */
export function toggleDarkMode() {
    const newTheme = appState.toggleTheme();
    
    // Update DOM
    document.body.setAttribute('data-theme', newTheme);
    
    // Update button state
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-pressed', (newTheme === 'dark').toString());
    }
    
    // Store preference
    localStorage.setItem('theme', newTheme);
    
    // Emit event
    eventBus.emit(EVENTS.THEME_CHANGED, { theme: newTheme });
    
    console.log('Theme changed to:', newTheme);
}

/**
 * Initialize theme from stored preference or system setting
 */
function initializeTheme() {
    let theme = localStorage.getItem('theme');
    
    // If no stored preference, use system preference
    if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Update state
    appState.setNestedState('ui', 'theme', theme);
    
    // Apply theme
    document.body.setAttribute('data-theme', theme);
    
    // Update button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-pressed', (theme === 'dark').toString());
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const systemTheme = e.matches ? 'dark' : 'light';
            appState.setNestedState('ui', 'theme', systemTheme);
            document.body.setAttribute('data-theme', systemTheme);
            
            if (themeToggle) {
                themeToggle.textContent = systemTheme === 'dark' ? '☀️' : '🌙';
                themeToggle.setAttribute('aria-pressed', (systemTheme === 'dark').toString());
            }
        }
    });
}

/**
 * Get current view name
 * @returns {string} Current view name
 */
export function getCurrentView() {
    return appState.ui.currentView;
}

/**
 * Show keyboard shortcuts modal
 */
export function showKeyboardShortcuts() {
    const shortcutsHtml = `
        <div class="modal-content shortcuts-modal">
            <div class="modal-header">
                <h3>⌨️ Keyboard Shortcuts</h3>
                <button class="modal-close" onclick="hideModal()" aria-label="Close shortcuts">&times;</button>
            </div>
            <div class="modal-body">
                <div class="shortcuts-grid">
                    <div class="shortcut-group">
                        <h4>Navigation</h4>
                        <dl>
                            <dt>Alt + 1</dt><dd>Home (Add Application)</dd>
                            <dt>Alt + 2</dt><dd>Applications List</dd>
                            <dt>Alt + 3</dt><dd>Dashboard</dd>
                            <dt>Alt + 4</dt><dd>Kanban Board</dd>
                            <dt>Arrow Keys</dt><dd>Navigate between tabs</dd>
                        </dl>
                    </div>
                    <div class="shortcut-group">
                        <h4>General</h4>
                        <dl>
                            <dt>Escape</dt><dd>Close modal</dd>
                            <dt>Tab</dt><dd>Navigate through elements</dd>
                            <dt>Enter</dt><dd>Activate focused element</dd>
                            <dt>Space</dt><dd>Toggle checkboxes/buttons</dd>
                        </dl>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="hideModal()">Got it!</button>
            </div>
        </div>
    `;
    
    // Import showModal function
    import('./ui.js').then(module => {
        module.showModal(shortcutsHtml, { ariaLabel: 'Keyboard shortcuts dialog' });
    });
}

// Make functions available globally for onclick handlers (temporary)
if (typeof window !== 'undefined') {
    window.showKeyboardShortcuts = showKeyboardShortcuts;
}