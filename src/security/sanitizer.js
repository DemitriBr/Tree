// Enhanced data sanitization functions

/**
 * Data sanitization utility for XSS prevention and data validation
 */
export const dataSanitizer = {
    /**
     * Enhanced HTML entity encoding
     * @param {string} text - Text to escape
     * @returns {string} HTML-escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Enhanced string sanitization with proper escaping
     * @param {string} value - Value to sanitize
     * @param {number} maxLength - Maximum length
     * @returns {string} Sanitized string
     */
    sanitizeString(value, maxLength = 100) {
        if (typeof value !== 'string') return '';
        
        // First normalize and trim
        let sanitized = value
            .trim()
            .substring(0, maxLength)
            .replace(/\s+/g, ' ');
        
        // Remove potential script injections
        sanitized = sanitized
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/data:/gi, '')
            .replace(/on\w+\s*=/gi, ''); // Remove event handlers
        
        // HTML escape for safe insertion
        return this.escapeHtml(sanitized);
    },
    
    /**
     * Enhanced URL sanitization
     * @param {string} url - URL to sanitize
     * @returns {string} Sanitized URL or empty string
     */
    sanitizeUrl(url) {
        if (!url) return '';
        
        try {
            // Remove javascript: and other dangerous protocols
            const cleanUrl = url.replace(/javascript:/gi, '').replace(/data:/gi, '');
            
            const urlObj = new URL(cleanUrl);
            
            // Only allow safe protocols
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return '';
            }
            
            // Check URL length (prevent extremely long URLs)
            if (urlObj.href.length > 2048) {
                return '';
            }
            
            return urlObj.href;
        } catch {
            return '';
        }
    },
    
    /**
     * Date sanitization and validation
     * @param {string|Date} date - Date to sanitize
     * @returns {string|null} ISO date string or null
     */
    sanitizeDate(date) {
        if (!date) return null;
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return null;
        }
        
        return dateObj.toISOString().split('T')[0];
    },
    
    /**
     * Enhanced email sanitization
     * @param {string} email - Email to sanitize
     * @returns {string} Sanitized email or empty string
     */
    sanitizeEmail(email) {
        if (!email) return '';
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmed = email.trim().toLowerCase();
        
        if (!emailRegex.test(trimmed) || trimmed.length > 254) {
            return '';
        }
        
        return this.escapeHtml(trimmed);
    },
    
    /**
     * Phone number sanitization
     * @param {string} phone - Phone number to sanitize
     * @returns {string} Sanitized phone number
     */
    sanitizePhone(phone) {
        if (!phone) return '';
        
        // Remove all non-digit characters except +, -, (, ), and spaces
        const cleaned = phone.replace(/[^\d\+\-\(\)\s]/g, '');
        
        if (cleaned.length > 20) {
            return '';
        }
        
        return this.escapeHtml(cleaned);
    },
    
    /**
     * Application data sanitization
     * @param {Object} data - Application data to sanitize
     * @returns {Object} Sanitized application data
     */
    sanitizeApplicationData(data) {
        return {
            ...data,
            jobTitle: this.sanitizeString(data.jobTitle, 100),
            companyName: this.sanitizeString(data.companyName, 100),
            applicationDate: this.sanitizeDate(data.applicationDate),
            status: ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'].includes(data.status) 
                ? data.status : 'applied',
            deadline: this.sanitizeDate(data.deadline),
            url: this.sanitizeUrl(data.url),
            salary: this.sanitizeString(data.salary, 50),
            location: this.sanitizeString(data.location, 100),
            progressStage: ['to-apply', 'applied', 'in-progress', 'final-stage', 'completed'].includes(data.progressStage)
                ? data.progressStage : 'to-apply',
            notes: this.sanitizeString(data.notes, 1000)
        };
    },
    
    /**
     * Interview data sanitization
     * @param {Object} data - Interview data to sanitize
     * @returns {Object} Sanitized interview data
     */
    sanitizeInterviewData(data) {
        return {
            ...data,
            date: this.sanitizeDate(data.date),
            time: this.sanitizeString(data.time, 20),
            type: ['phone', 'video', 'in-person', 'other'].includes(data.type) ? data.type : 'other',
            location: this.sanitizeString(data.location, 200),
            interviewer: this.sanitizeString(data.interviewer, 100),
            notes: this.sanitizeString(data.notes, 500),
            status: ['scheduled', 'completed', 'cancelled', 'rescheduled'].includes(data.status) 
                ? data.status : 'scheduled'
        };
    },
    
    /**
     * Contact data sanitization
     * @param {Object} data - Contact data to sanitize
     * @returns {Object} Sanitized contact data
     */
    sanitizeContactData(data) {
        return {
            ...data,
            name: this.sanitizeString(data.name, 100),
            title: this.sanitizeString(data.title, 100),
            type: ['recruiter', 'hiring-manager', 'employee', 'other'].includes(data.type) 
                ? data.type : 'other',
            email: this.sanitizeEmail(data.email),
            phone: this.sanitizePhone(data.phone),
            linkedin: this.sanitizeUrl(data.linkedin),
            notes: this.sanitizeString(data.notes, 500)
        };
    },
    
    /**
     * Document data sanitization
     * @param {Object} data - Document data to sanitize
     * @returns {Object} Sanitized document data
     */
    sanitizeDocumentData(data) {
        return {
            ...data,
            name: this.sanitizeString(data.name, 100),
            type: ['resume', 'cover-letter', 'portfolio', 'other'].includes(data.type) 
                ? data.type : 'other',
            version: this.sanitizeString(data.version, 20),
            dateSent: this.sanitizeDate(data.dateSent),
            notes: this.sanitizeString(data.notes, 500)
        };
    }
};