# Content Security Policy (CSP) Implementation

## Analysis of Current Resources

Based on the analysis of index.html, style.css, and other assets:

1. **Local Resources:**
   - Local CSS: `style.css`
   - Local JavaScript: `script.js` (ES6 module)
   - Local images: `/icons/` directory (various PWA icons)
   - Service Worker: `sw.js`
   - Manifest: `manifest.json`

2. **External Resources:**
   - Google Fonts: `fonts.googleapis.com` and `fonts.gstatic.com`
   - Font CSS import in style.css (line 4)

3. **Inline Content:**
   - All inline event handlers have been removed ✅
   - No inline styles detected in HTML
   - Potential inline styles in JavaScript (need to check)

## Recommended CSP Meta Tag

Add this CSP meta tag to the `<head>` section of index.html:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;
    connect-src 'self';
    worker-src 'self';
    manifest-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    object-src 'none';
">
```

## CSP Directive Explanations

1. **`default-src 'self'`**: Default policy for all resource types - only allow same-origin resources
2. **`script-src 'self'`**: Only allow scripts from same origin (no inline scripts or eval)
3. **`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`**: 
   - Allow local stylesheets
   - Allow inline styles (needed for dynamic styling in JS)
   - Allow Google Fonts CSS
4. **`font-src 'self' https://fonts.gstatic.com`**: Allow local and Google Fonts
5. **`img-src 'self' data: blob:`**: Allow local images, data URLs, and blob URLs (for generated content)
6. **`connect-src 'self'`**: Only allow XHR/fetch to same origin
7. **`worker-src 'self'`**: Only allow service workers from same origin
8. **`manifest-src 'self'`**: Only allow manifest from same origin
9. **`frame-ancestors 'none'`**: Prevent embedding in frames (clickjacking protection)
10. **`base-uri 'self'`**: Restrict base tag to same origin
11. **`object-src 'none'`**: Block all plugins (Flash, etc.)

## Alternative: Stricter CSP (if inline styles can be eliminated)

If all inline styles in JavaScript can be replaced with CSS classes:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self';
    style-src 'self' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;
    connect-src 'self';
    worker-src 'self';
    manifest-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    object-src 'none';
">
```

## Implementation Steps

1. **Add CSP meta tag** to index.html
2. **Test thoroughly** - CSP violations will be logged to browser console
3. **Check for dynamic inline styles** in JavaScript that might need adjustment
4. **Consider CSP reporting** for production:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;
    connect-src 'self';
    worker-src 'self';
    manifest-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    object-src 'none';
    report-uri /csp-violation-report-endpoint;
">
```

## Potential Issues to Monitor

1. **Dynamic styling in JavaScript**: Check if any JS code sets `element.style.*` directly
2. **Canvas and WebGL**: May need `img-src 'self' data: blob:` for canvas operations
3. **WebAssembly**: Would need `script-src 'wasm-unsafe-eval'` if used
4. **Development vs Production**: Consider looser CSP for development

## Testing Checklist

After implementing CSP:
- [ ] Application loads without console errors
- [ ] Google Fonts render correctly
- [ ] All JavaScript functionality works
- [ ] Service Worker registration succeeds
- [ ] PWA icons display properly
- [ ] Modal dialogs and dynamic content work
- [ ] Import/Export functionality works
- [ ] All animations and transitions work

## Future Enhancements

Consider moving to CSP headers instead of meta tags for production deployment, as headers are more secure and flexible.