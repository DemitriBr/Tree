// Application configuration constants
export const APP_CONSTANTS = {
    DB_NAME: 'JobApplicationTrackerDB',
    DB_VERSION: 1,
    STORE_NAME: 'applications',
    MAX_VISIBLE_NOTIFICATIONS: 3
};

export const STATUS_TYPES = [
    'applied', 
    'screening', 
    'interview', 
    'offer', 
    'rejected', 
    'withdrawn'
];

export const PROGRESS_STAGES = [
    'to-apply', 
    'applied', 
    'in-progress', 
    'final-stage', 
    'completed'
];

export const INTERVIEW_TYPES = [
    'phone',
    'video', 
    'in-person',
    'other'
];

export const INTERVIEW_STATUS = [
    'scheduled',
    'completed',
    'cancelled',
    'rescheduled'
];

export const CONTACT_TYPES = [
    'recruiter',
    'hiring-manager',
    'employee',
    'other'
];

export const DOCUMENT_TYPES = [
    'resume',
    'cover-letter',
    'portfolio',
    'other'
];

export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

export const VIEW_NAMES = {
    HOME: 'home',
    LIST: 'list',
    DASHBOARD: 'dashboard',
    KANBAN: 'kanban'
};