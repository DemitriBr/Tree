# JavaScript Modularization Plan

## Proposed Module Structure

Based on the analysis of script.js, here's the logical file structure for the new ES6 modules:

```
src/
├── main.js                     # New entry point (to be loaded by index.html)
├── core/
│   ├── db.js                   # IndexedDB interactions
│   ├── state.js                # AppState and global state management
│   ├── config.js               # Constants and configuration
│   └── utils.js                # Utility functions
├── ui/
│   ├── ui.js                   # General UI updates, notifications, modal system
│   ├── formHandler.js          # Form handling and validation
│   └── navigation.js           # Navigation setup and switching
├── views/
│   ├── listView.js             # Applications list rendering
│   ├── kanbanView.js           # Kanban board functionality
│   └── dashboardView.js        # Dashboard and analytics
├── features/
│   ├── interviews.js           # Interview management
│   ├── contacts.js             # Contact management
│   ├── documents.js            # Document management
│   ├── importExport.js         # Data import/export
│   └── backup.js               # Auto-backup and recovery
├── services/
│   ├── serviceWorkerManager.js # SW registration and offline handling
│   └── accessibility.js       # Accessibility manager
└── security/
    └── sanitizer.js            # Data sanitization functions
```

## Module Content Mapping

### 1. **main.js** (New Entry Point)
```javascript
// Functions to move here:
// - Main initialization logic
// - DOMContentLoaded event listener
// - App startup coordination

// New structure:
import { initDB } from './core/db.js';
import { AppState } from './core/state.js';
import { setupNavigation } from './ui/navigation.js';
import { setupForm } from './ui/formHandler.js';
import { registerServiceWorker } from './services/serviceWorkerManager.js';
import { accessibilityManager } from './services/accessibility.js';
```

### 2. **core/db.js** (Database Operations)
```javascript
// Functions to move from script.js:
// - initDB() (line 18)
// - generateId() (line 55) 
// - addApplicationToDB() (line 268)
// - getApplicationFromDB() (line 290)
// - updateApplicationInDB() (line 316)
// - deleteApplicationFromDB() (line 343)
// - getAllApplicationsFromDB() (line 383)
// - clearAllApplications() (line 4826)

// Constants to move:
// - DB_NAME, DB_VERSION, STORE_NAME (lines 5-7)
```

### 3. **core/state.js** (State Management)
```javascript
// Variables to move from script.js:
// - db (line 9)
// - activeModal (line 11)
// - modalStack (line 12)
// - isModalTransitioning (line 13)
// - searchFilterState (line 60)
// - draggedCard, draggedApplicationId, originalStatus (lines 1658-1660)

// Class to create:
class AppState {
    constructor() {
        this.db = null;
        this.modals = { active: null, stack: [], transitioning: false };
        this.search = { /* searchFilterState content */ };
        this.kanban = { draggedCard: null, draggedId: null, originalStatus: null };
        this.offline = { isOffline: false, pendingSync: false };
    }
}
```

### 4. **core/config.js** (Constants)
```javascript
// Constants to move:
// - STATUS_TYPES, PROGRESS_STAGES (if they exist)
// - APP_CONSTANTS (if they exist)
// - MAX_VISIBLE_NOTIFICATIONS (line 2711)

export const APP_CONSTANTS = {
    DB_NAME: 'JobApplicationTrackerDB',
    DB_VERSION: 1,
    STORE_NAME: 'applications',
    MAX_VISIBLE_NOTIFICATIONS: 3
};

export const STATUS_TYPES = ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];
export const PROGRESS_STAGES = ['to-apply', 'applied', 'in-progress', 'final-stage', 'completed'];
```

### 5. **core/utils.js** (Utility Functions)
```javascript
// Functions to move:
// - debounce() (line 69)
// - generateId() (line 55) [if not in db.js]
// - TypeChecker class (if exists)
// - SafeStorage class (if exists)
// - Performance monitoring utilities
```

### 6. **ui/ui.js** (UI Management)
```javascript
// Functions to move:
// - showNotification() (line 2714)
// - removeNotification() (line 2775)
// - notifySuccess(), notifyError(), notifyWarning(), notifyInfo() (lines 2814-2829)
// - Modal system functions (lines 2532+)
// - setupEventListeners() (newly added)

// Objects to move:
// - notificationQueue (line 2709)
// - modalState, modalDefaults (lines 2175-2183)
```

### 7. **ui/formHandler.js** (Form Handling)
```javascript
// Functions to move:
// - setupApplicationForm() (line 155)
// - handleFormSubmit() (line 188)
// - resetForm() (line 366)
// - initializeFormValidation() (line 5680)
// - FormValidator class (if exists)
// - validationRules (if exists)
```

### 8. **ui/navigation.js** (Navigation)
```javascript
// Functions to move:
// - setupNavButtons() (line 82)
// - switchView() (line 107)
// - setupDarkModeToggle() (if exists)
```

### 9. **views/listView.js** (List View)
```javascript
// Functions to move:
// - renderApplicationsList() (line 652)
// - createApplicationCard() (line 583)
// - applyFilters() (line 405)
// - applySorting() (line 467)
// - filterSortAndRender() (line 532)
// - enhanceCardWith... functions (accessibility enhancements)
```

### 10. **views/kanbanView.js** (Kanban Board)
```javascript
// Functions to move:
// - renderKanbanBoard() (line 1859)
// - createKanbanCard() (line 2002)
// - createKanbanColumn() (if exists)
// - drag/drop logic
// - dragHandlers object (line 1677)
```

### 11. **views/dashboardView.js** (Dashboard)
```javascript
// Functions to move:
// - renderDashboard() (line 1250)
// - calculateDashboardStats() (line 1161)
// - Chart creation logic
// - Canvas-based rendering functions
```

### 12. **features/interviews.js** (Interview Management)
```javascript
// Functions to move:
// - addInterview() (line 2844)
// - updateInterview() (line 2880)
// - deleteInterview() (line 2907)
// - showInterviewModal() (line 2926)
// - showInterviewsModal() (line 3056)
```

### 13. **features/contacts.js** (Contact Management)
```javascript
// Functions to move:
// - addContact() (line 3298)
// - updateContact() (line 3334)
// - deleteContact() (line 3361)
// - showContactModal() (line 3380)
// - showContactsModal() (line 3520)
```

### 14. **features/documents.js** (Document Management)
```javascript
// Functions to move:
// - addDocument() (line 3741)
// - updateDocument() (line 3775)
// - deleteDocument() (line 3802)
// - showDocumentModal() (line 3821)
// - showDocumentsModal() (line 3935)
```

### 15. **features/importExport.js** (Import/Export)
```javascript
// Functions to move:
// - exportData() (line 4170)
// - convertToCSV() (line 4263)
// - showExportModal() (line 4396)
// - importData() (line 4576)
// - showImportModal() (line 4835)
```

### 16. **features/backup.js** (Backup System)
```javascript
// Objects to move:
// - autoBackup object (line 6160)
// - dataRecovery object (line 6431)
```

### 17. **services/serviceWorkerManager.js** (Service Worker)
```javascript
// Functions to move:
// - registerServiceWorker() (line 5745)
// - updateServiceWorker() (line 5804)
// - syncOfflineData() (line 5900)

// Variables to move:
// - serviceWorkerRegistration, isOffline, pendingSync (lines 5732-5734)
```

### 18. **services/accessibility.js** (Accessibility)
```javascript
// Objects to move:
// - accessibilityManager object (line 6667)
// - Enhanced card functions for a11y
```

### 19. **security/sanitizer.js** (Data Sanitization)
```javascript
// Objects to move:
// - dataSanitizer object (enhanced version we just created)
```

## Import/Export Structure

### Example: main.js
```javascript
// Core modules
import { initDB } from './core/db.js';
import { AppState } from './core/state.js';
import { APP_CONSTANTS } from './core/config.js';

// UI modules
import { setupNavigation } from './ui/navigation.js';
import { setupForm } from './ui/formHandler.js';
import { initializeModalSystem } from './ui/ui.js';

// Services
import { registerServiceWorker } from './services/serviceWorkerManager.js';
import { accessibilityManager } from './services/accessibility.js';

// Initialize global state
const appState = new AppState();
window.appState = appState; // Temporary global access

async function init() {
    try {
        // Initialize database
        appState.db = await initDB();
        
        // Setup UI components
        setupForm();
        setupNavigation();
        initializeModalSystem();
        
        // Register service worker
        await registerServiceWorker();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
```

### Example: views/listView.js
```javascript
import { appState } from '../main.js';
import { getAllApplicationsFromDB } from '../core/db.js';
import { dataSanitizer } from '../security/sanitizer.js';
import { showNotification } from '../ui/ui.js';

export async function renderApplicationsList() {
    try {
        const applications = await getAllApplicationsFromDB();
        // ... rendering logic
    } catch (error) {
        showNotification('Failed to load applications', 'error');
    }
}

export function createApplicationCard(application) {
    // Use DOM creation methods (XSS-safe)
    const card = document.createElement('div');
    // ... safe card creation
    return card;
}
```

## Event-Driven Communication

Use a simple event bus for inter-module communication:

```javascript
// core/eventBus.js
class EventBus {
    constructor() {
        this.events = {};
    }
    
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }
    
    emit(eventName, data) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(callback => callback(data));
        }
    }
    
    off(eventName, callback) {
        if (this.events[eventName]) {
            this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
        }
    }
}

export const eventBus = new EventBus();
```

## Implementation Strategy

1. **Create directory structure**
2. **Start with core modules** (db.js, config.js, utils.js)
3. **Move state management** (state.js)
4. **Refactor UI modules** (ui.js, formHandler.js)
5. **Extract view modules** (listView.js, kanbanView.js, dashboardView.js)
6. **Move feature modules** (interviews.js, contacts.js, etc.)
7. **Update main.js** to coordinate everything
8. **Update index.html** to load main.js

This modularization will reduce the monolithic script.js from 8000+ lines to manageable modules of 200-500 lines each.