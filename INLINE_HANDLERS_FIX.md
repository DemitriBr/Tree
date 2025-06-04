# Inline Event Handlers Refactoring

## Current Inline Handlers Found:

1. Line 47: `onclick="showKeyboardShortcuts()"`
2. Line 48: `onclick="accessibilityManager.toggleHighContrast()"`  
3. Line 58: `onclick="showExportModal()"`
4. Line 59: `onclick="showImportModal()"`
5. Line 60: `onclick="showBackupSettingsModal()"`

## HTML Changes Required:

Replace the inline handlers with proper IDs:

```html
<!-- Line 47 - Replace: -->
<!-- OLD: <button class="btn-icon" onclick="showKeyboardShortcuts()" aria-label="Show keyboard shortcuts" title="Keyboard shortcuts (?)">⌨️</button> -->
<button id="keyboard-shortcuts-btn" class="btn-icon" aria-label="Show keyboard shortcuts" title="Keyboard shortcuts (?)">⌨️</button>

<!-- Line 48 - Replace: -->
<!-- OLD: <button class="btn-icon" onclick="accessibilityManager.toggleHighContrast()" aria-label="Toggle high contrast mode" title="High contrast">🔲</button> -->
<button id="high-contrast-btn" class="btn-icon" aria-label="Toggle high contrast mode" title="High contrast">🔲</button>

<!-- Line 58 - Replace: -->
<!-- OLD: <button class="export-btn" onclick="showExportModal()" aria-label="Export application data">📥 Export Data</button> -->
<button id="export-btn" class="export-btn" aria-label="Export application data">📥 Export Data</button>

<!-- Line 59 - Replace: -->
<!-- OLD: <button class="import-btn" onclick="showImportModal()" aria-label="Import application data">📤 Import Data</button> -->
<button id="import-btn" class="import-btn" aria-label="Import application data">📤 Import Data</button>

<!-- Line 60 - Replace: -->
<!-- OLD: <button class="backup-btn" onclick="showBackupSettingsModal()" aria-label="Backup settings">💾 Backup</button> -->
<button id="backup-btn" class="backup-btn" aria-label="Backup settings">💾 Backup</button>
```

## JavaScript Event Listeners to Add:

Add this function to script.js to set up all event listeners (should be called during initialization):

```javascript
function setupEventListeners() {
    // Keyboard shortcuts button
    const keyboardShortcutsBtn = document.getElementById('keyboard-shortcuts-btn');
    if (keyboardShortcutsBtn) {
        keyboardShortcutsBtn.addEventListener('click', function(event) {
            event.preventDefault();
            showKeyboardShortcuts();
        });
    }
    
    // High contrast toggle button  
    const highContrastBtn = document.getElementById('high-contrast-btn');
    if (highContrastBtn) {
        highContrastBtn.addEventListener('click', function(event) {
            event.preventDefault();
            if (typeof accessibilityManager !== 'undefined' && accessibilityManager.toggleHighContrast) {
                accessibilityManager.toggleHighContrast();
            }
        });
    }
    
    // Export data button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function(event) {
            event.preventDefault();
            showExportModal();
        });
    }
    
    // Import data button
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.addEventListener('click', function(event) {
            event.preventDefault();
            showImportModal();
        });
    }
    
    // Backup settings button
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) {
        backupBtn.addEventListener('click', function(event) {
            event.preventDefault();
            showBackupSettingsModal();
        });
    }
}

// Call this function during app initialization
// Add this line to the DOMContentLoaded event listener or main initialization function
document.addEventListener('DOMContentLoaded', function() {
    // ... existing initialization code ...
    setupEventListeners();
    // ... rest of initialization ...
});
```

## Alternative: Event Delegation Approach

For better performance and easier maintenance, you could also use event delegation:

```javascript
function setupEventDelegation() {
    // Single event listener on document body for all button clicks
    document.body.addEventListener('click', function(event) {
        const target = event.target;
        
        // Handle different button types based on ID
        switch(target.id) {
            case 'keyboard-shortcuts-btn':
                event.preventDefault();
                showKeyboardShortcuts();
                break;
                
            case 'high-contrast-btn':
                event.preventDefault();
                if (typeof accessibilityManager !== 'undefined' && accessibilityManager.toggleHighContrast) {
                    accessibilityManager.toggleHighContrast();
                }
                break;
                
            case 'export-btn':
                event.preventDefault();
                showExportModal();
                break;
                
            case 'import-btn':
                event.preventDefault();
                showImportModal();
                break;
                
            case 'backup-btn':
                event.preventDefault();
                showBackupSettingsModal();
                break;
        }
    });
}
```

## Benefits of This Refactoring:

1. **CSP Compliance**: Removes inline JavaScript which violates Content Security Policy
2. **Better Separation**: Keeps JavaScript logic separate from HTML markup
3. **Easier Testing**: Event handlers can be easily mocked and tested
4. **Better Error Handling**: Can add try-catch blocks around event handlers
5. **Improved Maintenance**: All event logic centralized in JavaScript files
6. **Memory Management**: Event listeners can be properly removed when needed

## Integration Note:

This should be integrated with the main app initialization. The `setupEventListeners()` function should be called after the DOM is loaded but before any user interactions are possible.