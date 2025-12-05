# Environment Configuration Guide

This document explains how to manage development and production environments.

## Current Setup

### Production (`main` branch)
- **URL:** https://espruar.com
- **Branch:** `main`
- **Deployment:** Automatic via GitHub Actions on push to `main`
- **Status:** Public repository, public site

### Development (`develop` branch)
- **Branch:** `develop`
- **Deployment:** Currently manual (can be automated)
- **Status:** Private development branch

## Environment-Specific Configuration

Currently, the application doesn't have environment-specific configs. If you need different settings for dev vs prod, consider:

### Option 1: Environment Variables (Recommended for future)

Create a config file that reads from environment:

```javascript
// js/config.js
export const CONFIG = {
    // ... existing config ...
    
    // Environment-specific
    ENVIRONMENT: import.meta.env?.MODE || 'production',
    ANALYTICS_ENABLED: import.meta.env?.VITE_ANALYTICS_ENABLED !== 'false',
    DEBUG_MODE: import.meta.env?.MODE === 'development',
};
```

### Option 2: Build-Time Configuration

Use a build script that injects environment variables:

```json
// package.json
{
  "scripts": {
    "build:dev": "NODE_ENV=development node build.js",
    "build:prod": "NODE_ENV=production node build.js"
  }
}
```

### Option 3: Separate Config Files

Create separate config files:
- `js/config.dev.js` - Development settings
- `js/config.prod.js` - Production settings
- `js/config.js` - Detects environment and imports appropriate config

## Recommended Setup

### For Static Site (Current Setup)

Since this is a static site deployed via GitHub Pages, you have a few options:

1. **Keep it simple:** Use the same codebase for both environments
   - Tests ensure quality before production
   - `develop` branch is for testing changes
   - `main` branch is always production-ready

2. **Separate Dev Site:** 
   - Deploy `develop` to a separate GitHub Pages site
   - Use a subdomain (dev.espruar.com) or separate domain
   - Configure DNS and CNAME accordingly

3. **Feature Flags:**
   - Add feature flags in `config.js` that can be toggled
   - Use URL parameters or localStorage to enable dev features
   - Example: `?dev=true` enables debug mode

## Current Recommendations

For your current setup, I recommend:

1. ✅ **Keep `main` as production** - Always stable, tested, deployed
2. ✅ **Use `develop` for active development** - Test changes here first
3. ✅ **Run tests on both branches** - Ensure quality
4. ⚠️ **Consider a separate dev deployment** - If you want to preview changes live
5. ⚠️ **Add feature flags if needed** - For experimental features

## Testing Strategy

### Development Testing
- Run tests locally: `npm test`
- Test in browser: Open `index.html` locally
- Use browser dev tools for debugging

### Pre-Production Testing
- All tests must pass on `develop`
- Manual testing on `develop` branch
- Create PR to `main` when ready

### Production
- Only merge to `main` after thorough testing
- Automatic deployment via GitHub Actions
- Monitor production site after deployment

## Future Enhancements

If you need more sophisticated environment management:

1. **Add environment detection:**
   ```javascript
   const isDevelopment = window.location.hostname === 'dev.espruar.com' || 
                         window.location.hostname === 'localhost';
   ```

2. **Add feature flags:**
   ```javascript
   const FEATURES = {
     NEW_DROW_COMPONENTS: isDevelopment || localStorage.getItem('feature_drow') === 'true',
     EXPERIMENTAL_MODE: isDevelopment
   };
   ```

3. **Add analytics separation:**
   - Use different GA tracking IDs for dev/prod
   - Or disable analytics in dev

4. **Add error reporting:**
   - Different error reporting endpoints for dev/prod
   - More verbose logging in dev

