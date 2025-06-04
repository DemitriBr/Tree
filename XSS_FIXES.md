# XSS Vulnerability Fixes

## Enhanced Data Sanitizer

First, we need to enhance the dataSanitizer to properly escape HTML:

```javascript
const dataSanitizer = {
    // Enhanced HTML entity encoding
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Enhanced string sanitization
    sanitizeString(value, maxLength = 100) {
        if (!value) return '';
        // First sanitize, then escape
        const sanitized = value.toString()
            .trim()
            .substring(0, maxLength)
            .replace(/\s+/g, ' ');
        return this.escapeHtml(sanitized);
    },
    
    // URL sanitization
    sanitizeUrl(url) {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            // Only allow http and https protocols
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                return '';
            }
            return urlObj.href;
        } catch {
            return '';
        }
    }
};
```

## Fixed createApplicationCard Function

```javascript
function createApplicationCard(application) {
    const card = document.createElement('div');
    card.className = 'application-card';
    card.setAttribute('data-id', application.id);
    card.setAttribute('data-status', application.status);
    card.setAttribute('role', 'article');
    card.setAttribute('tabindex', '0');
    
    // Create elements programmatically to avoid XSS
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const jobTitle = document.createElement('h3');
    jobTitle.className = 'job-title';
    jobTitle.textContent = application.jobTitle; // Safe text insertion
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge status-${application.status}`;
    statusBadge.textContent = application.status;
    
    cardHeader.appendChild(jobTitle);
    cardHeader.appendChild(statusBadge);
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    const companyInfo = document.createElement('div');
    companyInfo.className = 'company-info';
    
    const companyName = document.createElement('strong');
    companyName.textContent = application.companyName;
    companyInfo.appendChild(companyName);
    
    if (application.location) {
        const location = document.createElement('span');
        location.className = 'location';
        location.textContent = `📍 ${application.location}`;
        companyInfo.appendChild(location);
    }
    
    cardBody.appendChild(companyInfo);
    
    // Application details
    const details = document.createElement('div');
    details.className = 'application-details';
    
    if (application.salary) {
        const salaryDiv = document.createElement('div');
        salaryDiv.className = 'detail-item';
        
        const salaryLabel = document.createElement('span');
        salaryLabel.className = 'detail-label';
        salaryLabel.textContent = 'Salary:';
        
        const salaryValue = document.createElement('span');
        salaryValue.className = 'detail-value';
        salaryValue.textContent = application.salary;
        
        salaryDiv.appendChild(salaryLabel);
        salaryDiv.appendChild(salaryValue);
        details.appendChild(salaryDiv);
    }
    
    cardBody.appendChild(details);
    
    // Notes section
    if (application.notes) {
        const notesDiv = document.createElement('div');
        notesDiv.className = 'notes-preview';
        
        const notesP = document.createElement('p');
        const truncatedNotes = application.notes.substring(0, 100);
        notesP.textContent = truncatedNotes + (application.notes.length > 100 ? '...' : '');
        
        notesDiv.appendChild(notesP);
        cardBody.appendChild(notesDiv);
    }
    
    // Actions section
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    
    if (application.url) {
        const urlLink = document.createElement('a');
        urlLink.href = dataSanitizer.sanitizeUrl(application.url);
        urlLink.target = '_blank';
        urlLink.className = 'btn-icon';
        urlLink.title = 'View posting';
        urlLink.setAttribute('aria-label', 'View job posting');
        urlLink.textContent = '🔗';
        actions.appendChild(urlLink);
    }
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon edit-btn';
    editBtn.title = 'Edit application';
    editBtn.setAttribute('aria-label', 'Edit application');
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => editApplication(application.id));
    
    // Delete button  
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon delete-btn';
    deleteBtn.title = 'Delete application';
    deleteBtn.setAttribute('aria-label', 'Delete application');
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', () => deleteApplication(application.id));
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    cardBody.appendChild(actions);
    
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    
    return card;
}
```

## Fixed createKanbanCard Function

```javascript
function createKanbanCard(application) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.setAttribute('data-id', application.id);
    card.setAttribute('data-status', application.status);
    card.draggable = true;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    
    // Card header
    const header = document.createElement('div');
    header.className = 'kanban-card-header';
    
    const title = document.createElement('h4');
    title.className = 'kanban-card-title';
    title.textContent = application.jobTitle; // Safe text insertion
    
    header.appendChild(title);
    
    // Company info
    const company = document.createElement('div');
    company.className = 'kanban-card-company';
    company.textContent = application.companyName;
    
    // Location (if exists)
    if (application.location) {
        const location = document.createElement('div');
        location.className = 'kanban-card-location';
        location.textContent = `📍 ${application.location}`;
        card.appendChild(location);
    }
    
    // Salary (if exists)
    if (application.salary) {
        const salary = document.createElement('div');
        salary.className = 'kanban-card-salary';
        salary.textContent = `💰 ${application.salary}`;
        card.appendChild(salary);
    }
    
    // Notes preview
    if (application.notes) {
        const notes = document.createElement('div');
        notes.className = 'kanban-card-notes';
        const truncatedNotes = application.notes.substring(0, 60);
        notes.textContent = truncatedNotes + (application.notes.length > 60 ? '...' : '');
        card.appendChild(notes);
    }
    
    // Application date
    const date = document.createElement('div');
    date.className = 'kanban-card-date';
    date.textContent = new Date(application.applicationDate).toLocaleDateString();
    
    card.appendChild(header);
    card.appendChild(company);
    card.appendChild(date);
    
    // Add drag event listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    return card;
}
```

## Safe Modal Content Helper

```javascript
function createSafeModalContent(title, content) {
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = title; // Safe text insertion
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.setAttribute('aria-label', 'Close modal');
    closeButton.textContent = '×';
    
    header.appendChild(titleElement);
    header.appendChild(closeButton);
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    // If content is a string, escape it. If it's a DOM element, append it directly
    if (typeof content === 'string') {
        body.textContent = content;
    } else if (content instanceof HTMLElement) {
        body.appendChild(content);
    }
    
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    
    return modalContent;
}
```

## Enhanced Notification System

```javascript
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = icons[type] || icons.info;
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'notification-message';
    messageSpan.textContent = message; // Safe text insertion
    
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => removeNotification(notification));
    
    notification.appendChild(icon);
    notification.appendChild(messageSpan);
    notification.appendChild(closeButton);
    
    // Add to DOM and set up auto-removal
    document.querySelector('.notifications-container').appendChild(notification);
    
    if (duration > 0) {
        setTimeout(() => removeNotification(notification), duration);
    }
    
    return notification;
}
```