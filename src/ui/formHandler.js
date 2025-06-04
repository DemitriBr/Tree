// Form handling and validation
import { appState } from '../core/state.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { addApplicationToDB, updateApplicationInDB } from '../core/db.js';
import { dataSanitizer } from '../security/sanitizer.js';
import { generateId } from '../core/utils.js';
import { notifySuccess, notifyError } from './ui.js';

/**
 * Set up the application form
 */
export function setupApplicationForm() {
    const form = document.getElementById('applicationForm');
    if (!form) {
        console.error('Application form not found');
        return;
    }
    
    // Set up form validation
    initializeFormValidation();
    
    // Set up form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Set up form reset
    const resetButton = form.querySelector('button[type="reset"]');
    if (resetButton) {
        resetButton.addEventListener('click', handleFormReset);
    }
    
    console.log('Application form initialized');
}

/**
 * Handle form submission
 * @param {Event} event - Form submit event
 */
export async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        // Extract and sanitize form data
        const applicationData = extractFormData(formData);
        const sanitizedData = dataSanitizer.sanitizeApplicationData(applicationData);
        
        // Validate required fields
        const validation = validateApplicationData(sanitizedData);
        if (!validation.isValid) {
            displayValidationErrors(validation.errors);
            return;
        }
        
        // Check if this is an edit or new application
        const editId = form.getAttribute('data-edit-id');
        
        if (editId) {
            // Update existing application
            await updateApplicationInDB(editId, sanitizedData);
            notifySuccess('Application updated successfully');
            
            // Emit event
            eventBus.emit(EVENTS.APPLICATION_UPDATED, { 
                id: editId, 
                data: sanitizedData 
            });
        } else {
            // Create new application
            const applicationId = await addApplicationToDB(sanitizedData);
            notifySuccess('Application added successfully');
            
            // Emit event
            eventBus.emit(EVENTS.APPLICATION_ADDED, { 
                id: applicationId, 
                data: sanitizedData 
            });
        }
        
        // Reset form
        resetForm();
        
        // Refresh views that display applications
        refreshApplicationViews();
        
    } catch (error) {
        console.error('Form submission error:', error);
        notifyError('Failed to save application. Please try again.');
    }
}

/**
 * Extract data from form
 * @param {FormData} formData - Form data object
 * @returns {Object} Application data
 */
function extractFormData(formData) {
    return {
        jobTitle: formData.get('jobTitle') || '',
        companyName: formData.get('companyName') || '',
        applicationDate: formData.get('applicationDate') || '',
        status: formData.get('status') || 'applied',
        deadline: formData.get('deadline') || null,
        url: formData.get('url') || '',
        salary: formData.get('salary') || '',
        location: formData.get('location') || '',
        progressStage: formData.get('progressStage') || 'to-apply',
        notes: formData.get('notes') || ''
    };
}

/**
 * Validate application data
 * @param {Object} data - Application data to validate
 * @returns {Object} Validation result
 */
function validateApplicationData(data) {
    const errors = [];
    
    // Required field validation
    if (!data.jobTitle?.trim()) {
        errors.push({ field: 'jobTitle', message: 'Job title is required' });
    }
    
    if (!data.companyName?.trim()) {
        errors.push({ field: 'companyName', message: 'Company name is required' });
    }
    
    if (!data.applicationDate) {
        errors.push({ field: 'applicationDate', message: 'Application date is required' });
    }
    
    // Date validation
    if (data.applicationDate) {
        const appDate = new Date(data.applicationDate);
        const today = new Date();
        
        if (isNaN(appDate.getTime())) {
            errors.push({ field: 'applicationDate', message: 'Invalid application date' });
        } else if (appDate > today) {
            errors.push({ field: 'applicationDate', message: 'Application date cannot be in the future' });
        }
    }
    
    if (data.deadline) {
        const deadlineDate = new Date(data.deadline);
        if (isNaN(deadlineDate.getTime())) {
            errors.push({ field: 'deadline', message: 'Invalid deadline date' });
        }
    }
    
    // URL validation
    if (data.url && data.url.trim()) {
        try {
            new URL(data.url);
        } catch {
            errors.push({ field: 'url', message: 'Invalid URL format' });
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Display validation errors in the form
 * @param {Array} errors - Array of error objects
 */
function displayValidationErrors(errors) {
    // Clear existing errors
    clearValidationErrors();
    
    errors.forEach(error => {
        const field = document.getElementById(error.field);
        if (field) {
            // Add error class
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
            
            // Create error message element
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = error.message;
            errorMessage.id = `${error.field}-error`;
            
            // Link error to field for accessibility
            field.setAttribute('aria-describedby', errorMessage.id);
            
            // Insert error message after field
            field.parentNode.insertBefore(errorMessage, field.nextSibling);
        }
    });
    
    // Focus first error field
    if (errors.length > 0) {
        const firstErrorField = document.getElementById(errors[0].field);
        if (firstErrorField) {
            firstErrorField.focus();
        }
    }
}

/**
 * Clear validation errors from the form
 */
function clearValidationErrors() {
    const form = document.getElementById('applicationForm');
    if (!form) return;
    
    // Remove error classes and attributes
    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => {
        field.classList.remove('error');
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
    });
    
    // Remove error messages
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(message => {
        message.parentNode.removeChild(message);
    });
}

/**
 * Reset the form to initial state
 */
export function resetForm() {
    const form = document.getElementById('applicationForm');
    if (!form) return;
    
    // Clear form data
    form.reset();
    
    // Clear edit mode
    form.removeAttribute('data-edit-id');
    
    // Clear validation errors
    clearValidationErrors();
    
    // Reset form title
    const formTitle = form.querySelector('h2');
    if (formTitle) {
        formTitle.textContent = 'Add New Application';
    }
    
    // Reset submit button text
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Add Application';
    }
    
    // Focus first field
    const firstField = form.querySelector('input, select, textarea');
    if (firstField) {
        firstField.focus();
    }
    
    console.log('Form reset');
}

/**
 * Handle form reset button click
 * @param {Event} event - Reset event
 */
function handleFormReset(event) {
    event.preventDefault();
    resetForm();
}

/**
 * Populate form for editing an application
 * @param {Object} application - Application data
 */
export function populateFormForEdit(application) {
    const form = document.getElementById('applicationForm');
    if (!form || !application) return;
    
    // Set edit mode
    form.setAttribute('data-edit-id', application.id);
    
    // Populate form fields
    const fields = {
        jobTitle: application.jobTitle,
        companyName: application.companyName,
        applicationDate: application.applicationDate,
        status: application.status,
        deadline: application.deadline,
        url: application.url,
        salary: application.salary,
        location: application.location,
        progressStage: application.progressStage,
        notes: application.notes
    };
    
    Object.keys(fields).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field && fields[fieldName] !== null && fields[fieldName] !== undefined) {
            field.value = fields[fieldName];
        }
    });
    
    // Update form title and button
    const formTitle = form.querySelector('h2');
    if (formTitle) {
        formTitle.textContent = 'Edit Application';
    }
    
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Update Application';
    }
    
    // Clear any existing validation errors
    clearValidationErrors();
    
    console.log('Form populated for editing:', application.id);
}

/**
 * Initialize form validation
 */
function initializeFormValidation() {
    const form = document.getElementById('applicationForm');
    if (!form) return;
    
    // Add real-time validation
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.addEventListener('blur', validateField);
        field.addEventListener('input', clearFieldError);
    });
    
    console.log('Form validation initialized');
}

/**
 * Validate individual field
 * @param {Event} event - Field blur event
 */
function validateField(event) {
    const field = event.target;
    const fieldName = field.name;
    const value = field.value;
    
    // Clear existing errors for this field
    clearFieldError(event);
    
    // Validate based on field type
    let error = null;
    
    switch (fieldName) {
        case 'jobTitle':
        case 'companyName':
            if (!value.trim()) {
                error = `${fieldName === 'jobTitle' ? 'Job title' : 'Company name'} is required`;
            }
            break;
            
        case 'applicationDate':
            if (!value) {
                error = 'Application date is required';
            } else {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    error = 'Invalid date';
                } else if (date > new Date()) {
                    error = 'Date cannot be in the future';
                }
            }
            break;
            
        case 'url':
            if (value.trim()) {
                try {
                    new URL(value);
                } catch {
                    error = 'Invalid URL format';
                }
            }
            break;
    }
    
    // Display error if found
    if (error) {
        displayFieldError(field, error);
    }
}

/**
 * Display error for a specific field
 * @param {HTMLElement} field - Form field element
 * @param {string} errorMessage - Error message
 */
function displayFieldError(field, errorMessage) {
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = errorMessage;
    errorElement.id = `${field.name}-error`;
    
    field.setAttribute('aria-describedby', errorElement.id);
    field.parentNode.insertBefore(errorElement, field.nextSibling);
}

/**
 * Clear error for a specific field
 * @param {Event} event - Field input event
 */
function clearFieldError(event) {
    const field = event.target;
    const existingError = field.parentNode.querySelector('.error-message');
    
    if (existingError) {
        existingError.parentNode.removeChild(existingError);
    }
    
    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
}

/**
 * Refresh application views after form submission
 */
function refreshApplicationViews() {
    // Refresh list view if active
    if (appState.ui.currentView === 'list') {
        import('../views/listView.js').then(module => {
            if (module.renderApplicationsList) {
                module.renderApplicationsList();
            }
        });
    }
    
    // Refresh kanban view if active
    if (appState.ui.currentView === 'kanban') {
        import('../views/kanbanView.js').then(module => {
            if (module.renderKanbanBoard) {
                module.renderKanbanBoard();
            }
        });
    }
    
    // Refresh dashboard view if active
    if (appState.ui.currentView === 'dashboard') {
        import('../views/dashboardView.js').then(module => {
            if (module.renderDashboard) {
                module.renderDashboard();
            }
        });
    }
}