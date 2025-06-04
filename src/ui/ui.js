// UI management and notification system
import { appState } from '../core/state.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { NOTIFICATION_TYPES } from '../core/config.js';

/**
 * Initialize the modal system
 */
export function initializeModalSystem() {
    // Set up modal overlay click handler
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            hideModal();
        }
    });
    
    // Set up escape key handler
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && appState.isModalOpen()) {
            hideModal();
        }
    });
    
    console.log('Modal system initialized');
}

/**
 * Show a modal
 * @param {string} modalId - Modal ID or HTML content
 * @param {Object} options - Modal options
 */
export function showModal(modalId, options = {}) {
    const modalOverlay = document.getElementById('modalOverlay');
    if (!modalOverlay) {
        console.error('Modal overlay not found');
        return;
    }
    
    // Update state
    appState.openModal(modalId, options);
    
    // Clear existing content
    modalOverlay.innerHTML = '';
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    modalContainer.setAttribute('role', 'dialog');
    modalContainer.setAttribute('aria-modal', 'true');
    
    if (options.ariaLabel) {
        modalContainer.setAttribute('aria-label', options.ariaLabel);
    }
    
    // Add content
    if (typeof modalId === 'string' && modalId.startsWith('<')) {
        // HTML content
        modalContainer.innerHTML = modalId;
    } else {
        // Modal ID - find existing modal or create new one
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            modalContainer.appendChild(existingModal.cloneNode(true));
        } else {
            modalContainer.innerHTML = `<div class="modal-content"><p>Modal content not found: ${modalId}</p></div>`;
        }
    }
    
    modalOverlay.appendChild(modalContainer);
    
    // Show overlay
    modalOverlay.style.display = 'flex';
    modalOverlay.offsetHeight; // Force reflow
    modalOverlay.classList.add('show');
    
    // Focus management
    const firstFocusable = modalContainer.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }
    
    // Emit event
    eventBus.emit(EVENTS.MODAL_OPENED, { modalId, options });
    
    console.log('Modal shown:', modalId);
}

/**
 * Hide the currently active modal
 */
export function hideModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (!modalOverlay) return;
    
    const currentModal = appState.modals.active;
    
    // Update state
    appState.closeModal();
    
    // Hide overlay
    modalOverlay.classList.remove('show');
    
    setTimeout(() => {
        modalOverlay.style.display = 'none';
        modalOverlay.innerHTML = '';
    }, 300); // Match CSS transition duration
    
    // Emit event
    eventBus.emit(EVENTS.MODAL_CLOSED, { modalId: currentModal?.id });
    
    console.log('Modal hidden');
}

/**
 * Show an alert modal
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, error, warning, info)
 */
export function showAlertModal(title, message, type = 'info') {
    const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const alertHtml = `
        <div class="modal-content alert-modal alert-${type}">
            <div class="modal-header">
                <h3>
                    <span class="alert-icon">${iconMap[type] || iconMap.info}</span>
                    ${title}
                </h3>
                <button class="modal-close" onclick="hideModal()" aria-label="Close alert">&times;</button>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="hideModal()">OK</button>
            </div>
        </div>
    `;
    
    showModal(alertHtml, { ariaLabel: `${type} alert: ${title}` });
}

/**
 * Show a confirmation modal
 * @param {string} title - Confirmation title
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback for confirm action
 * @param {Function} onCancel - Callback for cancel action
 */
export function showConfirmModal(title, message, onConfirm, onCancel = null) {
    const confirmHtml = `
        <div class="modal-content confirm-modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="hideModal()" aria-label="Close confirmation">&times;</button>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
                <button class="btn btn-primary" id="confirmOK">OK</button>
            </div>
        </div>
    `;
    
    showModal(confirmHtml, { ariaLabel: `Confirmation: ${title}` });
    
    // Set up event handlers
    setTimeout(() => {
        const confirmButton = document.getElementById('confirmOK');
        const cancelButton = document.getElementById('confirmCancel');
        
        if (confirmButton) {
            confirmButton.onclick = () => {
                hideModal();
                if (onConfirm) onConfirm();
            };
        }
        
        if (cancelButton) {
            cancelButton.onclick = () => {
                hideModal();
                if (onCancel) onCancel();
            };
        }
    }, 100);
}

/**
 * Check if a modal is currently open
 * @param {string} modalId - Optional specific modal ID to check
 * @returns {boolean} True if modal is open
 */
export function isModalOpen(modalId = null) {
    return appState.isModalOpen(modalId);
}

/**
 * Show a notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {number} duration - Duration in milliseconds (0 = persistent)
 * @returns {Object} Notification object
 */
export function showNotification(message, type = NOTIFICATION_TYPES.INFO, duration = 5000) {
    const notification = {
        id: Date.now().toString(),
        message,
        type,
        duration,
        timestamp: Date.now()
    };
    
    // Add to state
    appState.addNotification(notification);
    
    // Create notification element
    const notificationElement = createNotificationElement(notification);
    
    // Add to DOM
    const container = getNotificationContainer();
    container.appendChild(notificationElement);
    
    // Auto-remove if duration is set
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification.id);
        }, duration);
    }
    
    // Emit event
    eventBus.emit(EVENTS.NOTIFICATION_SHOW, notification);
    
    return notification;
}

/**
 * Remove a notification
 * @param {string} notificationId - Notification ID
 */
export function removeNotification(notificationId) {
    // Remove from state
    appState.removeNotification(notificationId);
    
    // Remove from DOM
    const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (element) {
        element.classList.add('removing');
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }
    
    // Emit event
    eventBus.emit(EVENTS.NOTIFICATION_HIDE, { id: notificationId });
}

/**
 * Create notification element
 * @param {Object} notification - Notification data
 * @returns {HTMLElement} Notification element
 */
function createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification notification-${notification.type}`;
    element.setAttribute('data-notification-id', notification.id);
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'polite');
    
    const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = iconMap[notification.type] || iconMap.info;
    
    const message = document.createElement('span');
    message.className = 'notification-message';
    message.textContent = notification.message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.textContent = '×';
    closeButton.onclick = () => removeNotification(notification.id);
    
    element.appendChild(icon);
    element.appendChild(message);
    element.appendChild(closeButton);
    
    return element;
}

/**
 * Get or create notification container
 * @returns {HTMLElement} Notification container
 */
function getNotificationContainer() {
    let container = document.querySelector('.notifications-container');
    
    if (!container) {
        container = document.createElement('div');
        container.className = 'notifications-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(container);
    }
    
    return container;
}

/**
 * Notification helper functions
 */
export function notifySuccess(message, duration = 5000) {
    return showNotification(message, NOTIFICATION_TYPES.SUCCESS, duration);
}

export function notifyError(message, duration = 8000) {
    return showNotification(message, NOTIFICATION_TYPES.ERROR, duration);
}

export function notifyWarning(message, duration = 6000) {
    return showNotification(message, NOTIFICATION_TYPES.WARNING, duration);
}

export function notifyInfo(message, duration = 5000) {
    return showNotification(message, NOTIFICATION_TYPES.INFO, duration);
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 */
export function announceToScreenReader(message) {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
        if (announcer.parentNode) {
            announcer.parentNode.removeChild(announcer);
        }
    }, 1000);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
    const container = document.querySelector('.notifications-container');
    if (container) {
        container.innerHTML = '';
    }
    
    // Clear from state
    appState.notifications.queue = [];
    appState.notifications.active = 0;
}

// Make functions available globally for onclick handlers (temporary)
if (typeof window !== 'undefined') {
    window.hideModal = hideModal;
    window.showModal = showModal;
    window.showAlertModal = showAlertModal;
    window.showConfirmModal = showConfirmModal;
}