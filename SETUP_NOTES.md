# Vite Setup Instructions

Due to npm permissions issues, you'll need to run the following commands manually:

1. Fix npm permissions (if needed):
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

2. Install Vite as a dev dependency:
   ```bash
   npm install -D vite
   ```

3. Install SCSS support (for Phase 4):
   ```bash
   npm install -D sass
   ```

## Configuration Complete

The following files have been set up:
- `vite.config.js` - Vite configuration
- `package.json` - Updated with Vite scripts
- `public/` directory created with:
  - `sw.js` - Service worker
  - `manifest.json` - PWA manifest
- `index.html` - Updated to load script.js as a module

## To run the development server:
```bash
npm run dev
```

## To build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.