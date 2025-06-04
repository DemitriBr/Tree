# Data Sanitization Logic Review

## Current Implementation Analysis

### Existing dataSanitizer Object (Lines 5623-5677)

#### 1. `sanitizeString(value, maxLength = 100)`
**Current Implementation:**
```javascript
sanitizeString(value, maxLength = 100) {
    if (typeof value !== 'string') return '';
    
    return value
        .trim()
        .substring(0, maxLength)
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/\s+/g, ' '); // Normalize whitespace
}
```

**Security Assessment: INSUFFICIENT** ⚠️

**Issues:**
- Only removes `<` and `>` characters
- Doesn't handle quotes (`"` and `'`) which can break out of attributes
- Doesn't handle event handlers like `onload=`, `onclick=`
- Doesn't encode HTML entities
- Vulnerable to attribute-based XSS attacks

**Example Attack Vector:**
```javascript
// Current sanitizer would allow this:
const maliciousInput = 'job" onclick="alert(1)" title="';
const sanitized = dataSanitizer.sanitizeString(maliciousInput);
// Result: 'job" onclick="alert(1)" title="'
// This could be used in: <div title="${sanitized}">
```

#### 2. `sanitizeUrl(url)`
**Current Implementation:**
```javascript
sanitizeUrl(url) {
    if (!url) return '';
    
    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return '';
        }
        return urlObj.href;
    } catch {
        return '';
    }
}
```

**Security Assessment: ADEQUATE** ✅

**Strengths:**
- Properly validates URL format
- Restricts to safe protocols
- Handles malformed URLs gracefully

**Minor Enhancement Needed:**
- Could validate against suspicious domains
- Could check for extremely long URLs

#### 3. `sanitizeDate(date)`
**Current Implementation:**
```javascript
sanitizeDate(date) {
    if (!date) return null;
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
        return null;
    }
    
    return dateObj.toISOString().split('T')[0];
}
```

**Security Assessment: GOOD** ✅

**Strengths:**
- Validates date format
- Returns standardized format
- Handles invalid dates gracefully

## Enhanced Data Sanitizer

Here's an improved version addressing the security deficiencies:

```javascript
const dataSanitizer = {
    // Enhanced HTML entity encoding
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Enhanced string sanitization with proper escaping
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
    
    // Enhanced URL sanitization
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
    
    // Same date sanitization (already good)
    sanitizeDate(date) {
        if (!date) return null;
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return null;
        }
        
        return dateObj.toISOString().split('T')[0];
    },
    
    // Enhanced email sanitization
    sanitizeEmail(email) {
        if (!email) return '';
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmed = email.trim().toLowerCase();
        
        if (!emailRegex.test(trimmed) || trimmed.length > 254) {
            return '';
        }
        
        return this.escapeHtml(trimmed);
    },
    
    // Phone number sanitization
    sanitizePhone(phone) {
        if (!phone) return '';
        
        // Remove all non-digit characters except +, -, (, ), and spaces
        const cleaned = phone.replace(/[^\d\+\-\(\)\s]/g, '');
        
        if (cleaned.length > 20) {
            return '';
        }
        
        return this.escapeHtml(cleaned);
    },
    
    // Enhanced application data sanitization
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
    
    // Interview data sanitization
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
    
    // Contact data sanitization
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
    
    // Document data sanitization
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
```

## Security Context Analysis

### Where Sanitization is Used

1. **Data Entry Points**: ✅ Good coverage
   - Form submissions
   - Interview modals
   - Contact modals
   - Document modals

2. **Missing Sanitization Points**: ⚠️ Need attention
   - Import functionality error messages (Lines 5160, 5184)
   - Notification messages if user data is passed
   - Search/filter inputs
   - Any dynamic modal content

### Context-Specific Needs

1. **HTML Attribute Context**: Needs HTML attribute encoding
2. **JavaScript Context**: Needs JavaScript escaping (if any)
3. **URL Context**: Current URL sanitizer is adequate
4. **CSS Context**: Not currently needed

## Integration with XSS Fixes

The enhanced sanitizer should be used in conjunction with:

1. **DOM Creation Methods**: Use `textContent` instead of `innerHTML`
2. **Proper Element Creation**: Use `document.createElement()` and `appendChild()`
3. **CSP Headers**: Already implemented
4. **Input Validation**: Client-side and eventual server-side

## Testing Recommendations

Test the enhanced sanitizer with these attack vectors:

```javascript
// Test cases for the enhanced sanitizer
const testCases = [
    'normal text',
    '<script>alert("xss")</script>',
    'job" onclick="alert(1)" title="',
    "job' onload='alert(1)' data-test='",
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '"><script>alert(1)</script>',
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    'very'.repeat(100) + 'long'.repeat(100)
];
```

## Conclusion

The current sanitization is **insufficient for XSS prevention**. The enhanced version provides:

- Proper HTML entity encoding
- Event handler removal
- Protocol validation
- Length limits
- Context-appropriate sanitization

This should be implemented immediately as part of the security hardening phase.