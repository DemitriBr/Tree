// Job Application Tracker - Main JavaScript File
(function() {
    'use strict';

    // Application State
    const app = {
        db: null,
        currentView: 'dashboard',
        editingId: null,
        applications: [],
        filters: {
            search: '',
            status: '',
            sortBy: 'dateDesc'
        },
        draggedItem: null
    };

    // Database Configuration
    const DB_NAME = 'JobApplicationTracker';
    const DB_VERSION = 1;
    const STORE_NAME = 'applications';

    // Initialize IndexedDB
    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open database');
                reject(request.error);
            };

            request.onsuccess = () => {
                app.db = request.result;
                console.log('Database initialized successfully');
                resolve(app.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create applications object store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    // Create indexes for efficient querying
                    store.createIndex('company', 'company', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('dateApplied', 'dateApplied', { unique: false });
                    store.createIndex('deadline', 'deadline', { unique: false });
                }
            };
        });
    }

    // Database Operations
    async function saveApplication(data) {
        return new Promise((resolve, reject) => {
            const transaction = app.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Add timestamp
            data.updatedAt = new Date().toISOString();
            if (!data.createdAt) {
                data.createdAt = data.updatedAt;
            }
            
            const request = data.id ? store.put(data) : store.add(data);
            
            request.onsuccess = () => {
                showNotification('Application saved successfully!', 'success');
                resolve(request.result);
            };
            
            request.onerror = () => {
                showNotification('Failed to save application', 'error');
                reject(request.error);
            };
        });
    }

    async function getApplications() {
        return new Promise((resolve, reject) => {
            const transaction = app.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => {
                app.applications = request.result || [];
                resolve(app.applications);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async function getApplication(id) {
        return new Promise((resolve, reject) => {
            const transaction = app.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async function deleteApplication(id) {
        return new Promise((resolve, reject) => {
            const transaction = app.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                showNotification('Application deleted successfully', 'success');
                resolve();
            };
            
            request.onerror = () => {
                showNotification('Failed to delete application', 'error');
                reject(request.error);
            };
        });
    }

    // View Management
    function switchView(viewName) {
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.removeAttribute('aria-current');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        document.querySelector(`[data-view="${viewName}"]`).setAttribute('aria-current', 'page');
        
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show selected view
        document.getElementById(`${viewName}-view`).classList.add('active');
        app.currentView = viewName;
        
        // Load view-specific data
        loadViewData(viewName);
    }

    async function loadViewData(viewName) {
        await getApplications();
        
        switch(viewName) {
            case 'dashboard':
                updateDashboard();
                break;
            case 'applications':
                renderApplicationsList();
                break;
            case 'kanban':
                renderKanbanBoard();
                break;
            case 'add-edit':
                if (!app.editingId) {
                    resetForm();
                }
                break;
        }
    }

    // Dashboard Functions
    function updateDashboard() {
        const stats = calculateStatistics();
        
        // Update stat cards
        document.getElementById('totalApplications').textContent = stats.total;
        document.getElementById('interviewCount').textContent = stats.interviews;
        document.getElementById('offerCount').textContent = stats.offers;
        document.getElementById('responseRate').textContent = `${stats.responseRate}%`;
        
        // Update charts
        renderStatusChart(stats.statusCounts);
        renderTimelineChart();
        
        // Update upcoming interviews
        renderUpcomingInterviews();
        
        // Update recent activity
        renderRecentActivity();
    }

    function calculateStatistics() {
        const stats = {
            total: app.applications.length,
            interviews: 0,
            offers: 0,
            responses: 0,
            statusCounts: {
                applied: 0,
                interview: 0,
                offer: 0,
                rejected: 0,
                withdrawn: 0
            }
        };
        
        app.applications.forEach(app => {
            if (app.status) {
                stats.statusCounts[app.status] = (stats.statusCounts[app.status] || 0) + 1;
            }
            
            if (app.status === 'interview') stats.interviews++;
            if (app.status === 'offer') stats.offers++;
            if (app.status !== 'applied') stats.responses++;
        });
        
        stats.responseRate = stats.total > 0 ? Math.round((stats.responses / stats.total) * 100) : 0;
        
        return stats;
    }

    function renderStatusChart(statusCounts) {
        const canvas = document.getElementById('statusChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const data = Object.entries(statusCounts);
        const colors = {
            applied: '#3498db',
            interview: '#f39c12',
            offer: '#2ecc71',
            rejected: '#e74c3c',
            withdrawn: '#95a5a6'
        };
        
        // Calculate dimensions
        const padding = 40;
        const barWidth = (canvas.width - padding * 2) / data.length - 20;
        const maxValue = Math.max(...Object.values(statusCounts));
        const scale = (canvas.height - padding * 2) / (maxValue || 1);
        
        // Draw bars
        data.forEach(([status, count], index) => {
            const x = padding + index * (barWidth + 20);
            const barHeight = count * scale;
            const y = canvas.height - padding - barHeight;
            
            // Draw bar
            ctx.fillStyle = colors[status] || '#ccc';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw label
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(status.charAt(0).toUpperCase() + status.slice(1), x + barWidth / 2, canvas.height - 20);
            
            // Draw count
            ctx.fillText(count, x + barWidth / 2, y - 5);
        });
    }

    function renderTimelineChart() {
        const canvas = document.getElementById('timelineChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Group applications by month
        const monthlyData = {};
        app.applications.forEach(application => {
            const date = new Date(application.dateApplied);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        });
        
        // Sort months and get last 6 months
        const sortedMonths = Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6);
        
        if (sortedMonths.length === 0) return;
        
        // Draw line chart
        const padding = 40;
        const pointSpacing = (canvas.width - padding * 2) / (sortedMonths.length - 1 || 1);
        const maxValue = Math.max(...sortedMonths.map(([, count]) => count));
        const scale = (canvas.height - padding * 2) / (maxValue || 1);
        
        // Draw axes
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border-color');
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Draw line
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent-primary');
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        sortedMonths.forEach(([month, count], index) => {
            const x = padding + index * pointSpacing;
            const y = canvas.height - padding - (count * scale);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // Draw point
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent-primary');
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw label
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(month, x, canvas.height - 10);
            
            // Draw value
            ctx.fillText(count, x, y - 10);
        });
        
        ctx.stroke();
    }

    function renderUpcomingInterviews() {
        const container = document.getElementById('upcomingInterviews');
        const interviews = [];
        
        // Collect all interviews from applications
        app.applications.forEach(application => {
            if (application.interviews && application.interviews.length > 0) {
                application.interviews.forEach(interview => {
                    if (interview.date && new Date(interview.date) >= new Date()) {
                        interviews.push({
                            ...interview,
                            company: application.company,
                            position: application.position
                        });
                    }
                });
            }
        });
        
        // Sort by date
        interviews.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (interviews.length === 0) {
            container.innerHTML = '<p class="empty-state">No upcoming interviews scheduled</p>';
            return;
        }
        
        container.innerHTML = interviews.slice(0, 5).map(interview => {
            const date = new Date(interview.date);
            const day = date.getDate();
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            
            return `
                <div class="interview-item">
                    <div class="interview-date">
                        <div class="day">${day}</div>
                        <div class="month">${month}</div>
                    </div>
                    <div class="interview-details">
                        <h4>${interview.company} - ${interview.position}</h4>
                        <p>${interview.type || 'Interview'} at ${interview.time || 'TBD'}</p>
                        ${interview.location ? `<p>${interview.location}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        
        // Sort applications by update date
        const recent = [...app.applications]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5);
        
        if (recent.length === 0) {
            container.innerHTML = '<p class="empty-state">No recent activity</p>';
            return;
        }
        
        container.innerHTML = recent.map(app => {
            const date = new Date(app.updatedAt || app.createdAt);
            const timeAgo = getTimeAgo(date);
            
            return `
                <div class="activity-item">
                    <p><strong>${app.company}</strong> - ${app.position}</p>
                    <p class="text-secondary">Status: ${app.status} • ${timeAgo}</p>
                </div>
            `;
        }).join('');
    }

    // Applications List Functions
    function renderApplicationsList() {
        const container = document.getElementById('applicationsList');
        let filtered = filterAndSortApplications();
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>No applications found</h3>
                    <p>Start tracking your job applications by clicking "Add New"</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filtered.map(app => createApplicationCard(app)).join('');
    }

    function createApplicationCard(application) {
        const deadline = application.deadline ? new Date(application.deadline) : null;
        const today = new Date();
        const daysUntilDeadline = deadline ? Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)) : null;
        const showDeadlineWarning = daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline >= 0;
        
        return `
            <div class="application-card status-${application.status}" data-id="${application.id}">
                ${showDeadlineWarning ? `<div class="deadline-warning">Due in ${daysUntilDeadline} days</div>` : ''}
                <div class="application-header">
                    <div class="application-title">
                        <h3>${escapeHtml(application.company)}</h3>
                        <p>${escapeHtml(application.position)}</p>
                    </div>
                    <div class="application-actions">
                        <button class="btn btn-small btn-secondary" onclick="editApplication(${application.id})" aria-label="Edit application">
                            ✏️
                        </button>
                        <button class="btn btn-small btn-danger" onclick="confirmDelete(${application.id})" aria-label="Delete application">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="application-details">
                    <div class="detail-item">
                        <span class="detail-label">Applied</span>
                        <span class="detail-value">${formatDate(application.dateApplied)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">${capitalizeFirst(application.status)}</span>
                    </div>
                    ${application.location ? `
                        <div class="detail-item">
                            <span class="detail-label">Location</span>
                            <span class="detail-value">${escapeHtml(application.location)}</span>
                        </div>
                    ` : ''}
                    ${application.salary ? `
                        <div class="detail-item">
                            <span class="detail-label">Salary</span>
                            <span class="detail-value">${escapeHtml(application.salary)}</span>
                        </div>
                    ` : ''}
                </div>
                ${application.stage ? `
                    <div class="application-tags">
                        <span class="tag">${formatStage(application.stage)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function filterAndSortApplications() {
        let filtered = [...app.applications];
        
        // Apply search filter
        if (app.filters.search) {
            const searchLower = app.filters.search.toLowerCase();
            filtered = filtered.filter(application => 
                application.company.toLowerCase().includes(searchLower) ||
                application.position.toLowerCase().includes(searchLower) ||
                (application.notes && application.notes.toLowerCase().includes(searchLower)) ||
                (application.location && application.location.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply status filter
        if (app.filters.status) {
            filtered = filtered.filter(application => application.status === app.filters.status);
        }
        
        // Apply sorting
        switch(app.filters.sortBy) {
            case 'dateDesc':
                filtered.sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
                break;
            case 'dateAsc':
                filtered.sort((a, b) => new Date(a.dateApplied) - new Date(b.dateApplied));
                break;
            case 'company':
                filtered.sort((a, b) => a.company.localeCompare(b.company));
                break;
            case 'deadline':
                filtered.sort((a, b) => {
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
                });
                break;
        }
        
        return filtered;
    }

    // Kanban Board Functions
    function renderKanbanBoard() {
        renderProgressTracker();
        
        const board = document.getElementById('kanbanBoard');
        const columns = ['applied', 'interview', 'offer', 'rejected'];
        
        board.innerHTML = columns.map(status => {
            const applications = app.applications.filter(app => app.status === status);
            
            return `
                <div class="kanban-column" data-status="${status}">
                    <div class="kanban-header">
                        <h3>${capitalizeFirst(status)}</h3>
                        <span class="kanban-count">${applications.length}</span>
                    </div>
                    <div class="kanban-items" ondrop="handleDrop(event, '${status}')" ondragover="handleDragOver(event)">
                        ${applications.map(app => createKanbanItem(app)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    function createKanbanItem(application) {
        return `
            <div class="kanban-item" draggable="true" data-id="${application.id}" 
                 ondragstart="handleDragStart(event, ${application.id})"
                 ondragend="handleDragEnd(event)">
                <h4>${escapeHtml(application.company)}</h4>
                <p>${escapeHtml(application.position)}</p>
                <div class="kanban-meta">
                    <span>${formatDate(application.dateApplied)}</span>
                    ${application.stage ? `<span>${formatStage(application.stage)}</span>` : ''}
                </div>
            </div>
        `;
    }

    function renderProgressTracker() {
        const tracker = document.getElementById('progressTracker');
        const stages = [
            { key: 'applied', label: 'Applied' },
            { key: 'interview', label: 'Interview' },
            { key: 'offer', label: 'Offer' },
            { key: 'completed', label: 'Completed' }
        ];
        
        // Clear existing content except lines
        tracker.querySelectorAll('.progress-step').forEach(el => el.remove());
        
        stages.forEach((stage, index) => {
            const step = document.createElement('div');
            step.className = 'progress-step';
            step.innerHTML = `<span class="progress-label">${stage.label}</span>`;
            
            // Check if any applications are at or past this stage
            const hasApplications = app.applications.some(app => {
                const stageIndex = stages.findIndex(s => s.key === app.status);
                return stageIndex >= index;
            });
            
            if (hasApplications) {
                step.classList.add('completed');
            }
            
            tracker.appendChild(step);
        });
        
        // Update progress line
        const completedSteps = tracker.querySelectorAll('.progress-step.completed').length;
        const progressPercent = (completedSteps / stages.length) * 100;
        document.getElementById('progressLineFilled').style.width = `${progressPercent}%`;
    }

    // Drag and Drop Handlers
    window.handleDragStart = function(event, id) {
        app.draggedItem = id;
        event.target.classList.add('dragging');
    };

    window.handleDragEnd = function(event) {
        event.target.classList.remove('dragging');
    };

    window.handleDragOver = function(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    };

    window.handleDrop = async function(event, newStatus) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        if (app.draggedItem) {
            const application = await getApplication(app.draggedItem);
            if (application) {
                application.status = newStatus;
                await saveApplication(application);
                await loadViewData('kanban');
            }
        }
        
        app.draggedItem = null;
    };

    // Form Functions
    function resetForm() {
        document.getElementById('formTitle').textContent = 'Add New Application';
        document.getElementById('applicationForm').reset();
        document.getElementById('interviewsContainer').innerHTML = '';
        document.getElementById('contactsContainer').innerHTML = '';
        document.getElementById('documentsContainer').innerHTML = '';
        app.editingId = null;
        
        // Set default date to today
        document.getElementById('dateApplied').value = new Date().toISOString().split('T')[0];
    }

    window.editApplication = async function(id) {
        const application = await getApplication(id);
        if (!application) return;
        
        app.editingId = id;
        document.getElementById('formTitle').textContent = 'Edit Application';
        
        // Fill basic fields
        document.getElementById('company').value = application.company || '';
        document.getElementById('position').value = application.position || '';
        document.getElementById('location').value = application.location || '';
        document.getElementById('type').value = application.type || 'full-time';
        document.getElementById('salary').value = application.salary || '';
        document.getElementById('url').value = application.url || '';
        document.getElementById('dateApplied').value = application.dateApplied || '';
        document.getElementById('deadline').value = application.deadline || '';
        document.getElementById('status').value = application.status || 'applied';
        document.getElementById('stage').value = application.stage || 'application-sent';
        document.getElementById('notes').value = application.notes || '';
        
        // Fill interviews
        const interviewsContainer = document.getElementById('interviewsContainer');
        interviewsContainer.innerHTML = '';
        if (application.interviews) {
            application.interviews.forEach(() => addInterviewFields());
            application.interviews.forEach((interview, index) => {
                const fields = interviewsContainer.querySelectorAll('.interview-group')[index];
                if (fields) {
                    fields.querySelector('[name="interviewDate"]').value = interview.date || '';
                    fields.querySelector('[name="interviewTime"]').value = interview.time || '';
                    fields.querySelector('[name="interviewType"]').value = interview.type || '';
                    fields.querySelector('[name="interviewLocation"]').value = interview.location || '';
                }
            });
        }
        
        // Fill contacts
        const contactsContainer = document.getElementById('contactsContainer');
        contactsContainer.innerHTML = '';
        if (application.contacts) {
            application.contacts.forEach(() => addContactFields());
            application.contacts.forEach((contact, index) => {
                const fields = contactsContainer.querySelectorAll('.contact-group')[index];
                if (fields) {
                    fields.querySelector('[name="contactName"]').value = contact.name || '';
                    fields.querySelector('[name="contactTitle"]').value = contact.title || '';
                    fields.querySelector('[name="contactEmail"]').value = contact.email || '';
                    fields.querySelector('[name="contactPhone"]').value = contact.phone || '';
                }
            });
        }
        
        // Fill documents
        const documentsContainer = document.getElementById('documentsContainer');
        documentsContainer.innerHTML = '';
        if (application.documents) {
            application.documents.forEach(doc => addDocumentReference(doc));
        }
        
        switchView('add-edit');
    };

    function addInterviewFields() {
        const container = document.getElementById('interviewsContainer');
        const interviewGroup = document.createElement('div');
        interviewGroup.className = 'form-grid interview-group';
        interviewGroup.innerHTML = `
            <div class="form-group">
                <label>Date</label>
                <input type="date" class="form-control" name="interviewDate">
            </div>
            <div class="form-group">
                <label>Time</label>
                <input type="time" class="form-control" name="interviewTime">
            </div>
            <div class="form-group">
                <label>Type</label>
                <select class="form-control" name="interviewType">
                    <option value="">Select type</option>
                    <option value="Phone Screen">Phone Screen</option>
                    <option value="Video Call">Video Call</option>
                    <option value="On-site">On-site</option>
                    <option value="Technical">Technical</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="Panel">Panel</option>
                </select>
            </div>
            <div class="form-group">
                <label>Location/Link</label>
                <input type="text" class="form-control" name="interviewLocation" placeholder="Address or meeting link">
            </div>
            <button type="button" class="btn btn-small btn-danger" onclick="this.parentElement.remove()">Remove</button>
        `;
        container.appendChild(interviewGroup);
    }

    function addContactFields() {
        const container = document.getElementById('contactsContainer');
        const contactGroup = document.createElement('div');
        contactGroup.className = 'form-grid contact-group';
        contactGroup.innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" class="form-control" name="contactName">
            </div>
            <div class="form-group">
                <label>Title</label>
                <input type="text" class="form-control" name="contactTitle">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" class="form-control" name="contactEmail">
            </div>
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" class="form-control" name="contactPhone">
            </div>
            <button type="button" class="btn btn-small btn-danger" onclick="this.parentElement.remove()">Remove</button>
        `;
        container.appendChild(contactGroup);
    }

    function addDocumentReference(doc = {}) {
        const container = document.getElementById('documentsContainer');
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        docItem.innerHTML = `
            <div class="document-icon">${getDocumentIcon(doc.type)}</div>
            <div class="document-details">
                <input type="text" class="form-control" name="documentName" 
                       placeholder="Document name" value="${escapeHtml(doc.name || '')}">
                <select class="form-control" name="documentType">
                    <option value="resume" ${doc.type === 'resume' ? 'selected' : ''}>Resume</option>
                    <option value="cover-letter" ${doc.type === 'cover-letter' ? 'selected' : ''}>Cover Letter</option>
                    <option value="portfolio" ${doc.type === 'portfolio' ? 'selected' : ''}>Portfolio</option>
                    <option value="reference" ${doc.type === 'reference' ? 'selected' : ''}>Reference</option>
                    <option value="other" ${doc.type === 'other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <button type="button" class="btn btn-small btn-danger" onclick="this.parentElement.remove()">Remove</button>
        `;
        container.appendChild(docItem);
    }

    // Form Validation
    function validateForm(formData) {
        const errors = [];
        
        if (!formData.company || formData.company.trim() === '') {
            errors.push('Company name is required');
        }
        
        if (!formData.position || formData.position.trim() === '') {
            errors.push('Position title is required');
        }
        
        if (!formData.dateApplied) {
            errors.push('Application date is required');
        }
        
        if (formData.deadline && formData.dateApplied) {
            const applied = new Date(formData.dateApplied);
            const deadline = new Date(formData.deadline);
            if (deadline < applied) {
                errors.push('Deadline cannot be before application date');
            }
        }
        
        if (formData.url && !isValidUrl(formData.url)) {
            errors.push('Please enter a valid URL');
        }
        
        return errors;
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Delete Functions
    window.confirmDelete = function(id) {
        app.deletingId = id;
        document.getElementById('deleteModal').classList.add('active');
        document.getElementById('deleteModal').setAttribute('aria-hidden', 'false');
    };

    async function handleDelete() {
        if (app.deletingId) {
            await deleteApplication(app.deletingId);
            await loadViewData(app.currentView);
            closeDeleteModal();
        }
    }

    function closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('active');
        document.getElementById('deleteModal').setAttribute('aria-hidden', 'true');
        app.deletingId = null;
    }

    // Export/Import Functions
    function exportData() {
        const dataStr = JSON.stringify(app.applications, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `job-applications-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification('Data exported successfully', 'success');
    }

    async function importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format');
            }
            
            // Validate and import each application
            for (const application of data) {
                if (application.company && application.position) {
                    delete application.id; // Remove ID to create new entries
                    await saveApplication(application);
                }
            }
            
            await loadViewData(app.currentView);
            showNotification(`Imported ${data.length} applications successfully`, 'success');
        } catch (error) {
            showNotification('Failed to import data. Please check the file format.', 'error');
            console.error('Import error:', error);
        }
    }

    // Notification System
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <p>${escapeHtml(message)}</p>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Also try browser notifications for important events
        if (type === 'success' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Job Tracker', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    // Theme Management
    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    }

    function updateThemeIcon(theme) {
        document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    // Utility Functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function formatStage(stage) {
        return stage.split('-').map(word => capitalizeFirst(word)).join(' ');
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        
        return 'Just now';
    }

    function getDocumentIcon(type) {
        const icons = {
            'resume': 'CV',
            'cover-letter': 'CL',
            'portfolio': 'PF',
            'reference': 'RF',
            'other': 'DOC'
        };
        return icons[type] || 'DOC';
    }

    // Event Listeners
    function initEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', toggleTheme);
        
        // Form submission
        document.getElementById('applicationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                company: document.getElementById('company').value.trim(),
                position: document.getElementById('position').value.trim(),
                location: document.getElementById('location').value.trim(),
                type: document.getElementById('type').value,
                salary: document.getElementById('salary').value.trim(),
                url: document.getElementById('url').value.trim(),
                dateApplied: document.getElementById('dateApplied').value,
                deadline: document.getElementById('deadline').value,
                status: document.getElementById('status').value,
                stage: document.getElementById('stage').value,
                notes: document.getElementById('notes').value.trim()
            };
            
            // Validate form
            const errors = validateForm(formData);
            if (errors.length > 0) {
                showNotification(errors.join('. '), 'error');
                return;
            }
            
            // Collect interviews
            formData.interviews = [];
            document.querySelectorAll('.interview-group').forEach(group => {
                const interview = {
                    date: group.querySelector('[name="interviewDate"]').value,
                    time: group.querySelector('[name="interviewTime"]').value,
                    type: group.querySelector('[name="interviewType"]').value,
                    location: group.querySelector('[name="interviewLocation"]').value
                };
                if (interview.date || interview.time || interview.type || interview.location) {
                    formData.interviews.push(interview);
                }
            });
            
            // Collect contacts
            formData.contacts = [];
            document.querySelectorAll('.contact-group').forEach(group => {
                const contact = {
                    name: group.querySelector('[name="contactName"]').value.trim(),
                    title: group.querySelector('[name="contactTitle"]').value.trim(),
                    email: group.querySelector('[name="contactEmail"]').value.trim(),
                    phone: group.querySelector('[name="contactPhone"]').value.trim()
                };
                if (contact.name || contact.email || contact.phone) {
                    formData.contacts.push(contact);
                }
            });
            
            // Collect documents
            formData.documents = [];
            document.querySelectorAll('.document-item').forEach(item => {
                const doc = {
                    name: item.querySelector('[name="documentName"]').value.trim(),
                    type: item.querySelector('[name="documentType"]').value
                };
                if (doc.name) {
                    formData.documents.push(doc);
                }
            });
            
            // Save application
            if (app.editingId) {
                formData.id = app.editingId;
            }
            
            await saveApplication(formData);
            resetForm();
            switchView('applications');
        });
        
        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            resetForm();
            switchView('applications');
        });
        
        // Add buttons
        document.getElementById('addInterviewBtn').addEventListener('click', addInterviewFields);
        document.getElementById('addContactBtn').addEventListener('click', addContactFields);
        document.getElementById('addDocumentBtn').addEventListener('click', () => addDocumentReference());
        
        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            app.filters.search = e.target.value;
            renderApplicationsList();
        });
        
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            app.filters.status = e.target.value;
            renderApplicationsList();
        });
        
        document.getElementById('sortBy').addEventListener('change', (e) => {
            app.filters.sortBy = e.target.value;
            renderApplicationsList();
        });
        
        // Export/Import
        document.getElementById('exportBtn').addEventListener('click', exportData);
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        
        document.getElementById('importFile').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await importData(file);
                e.target.value = ''; // Reset file input
            }
        });
        
        // Delete modal
        document.getElementById('confirmDeleteBtn').addEventListener('click', handleDelete);
        document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
        document.querySelector('.modal-close').addEventListener('click', closeDeleteModal);
        
        // Close modal on outside click
        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                closeDeleteModal();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('deleteModal').classList.contains('active')) {
                closeDeleteModal();
            }
        });
    }

    // Service Worker Registration (for offline support)
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    // Request notification permission
    async function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    // Initialize Application
    async function init() {
        try {
            // Load theme
            loadTheme();
            
            // Initialize database
            await initDB();
            
            // Initialize event listeners
            initEventListeners();
            
            // Load initial data
            await loadViewData(app.currentView);
            
            // Register service worker for offline support
            // Note: This requires a sw.js file to be created separately
            // registerServiceWorker();
            
            // Request notification permission
            requestNotificationPermission();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            showNotification('Failed to initialize application. Please refresh the page.', 'error');
        }
    }

    // Start the application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
