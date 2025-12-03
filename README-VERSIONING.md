# Version Management Guide

This project uses automated versioning with semantic versioning (SemVer) format: `vMAJOR.MINOR.PATCH`

## Version Number Meanings

- **MAJOR (X.0.0)**: Complete refactors, major architectural changes
  - Example: v1 → v2 (complete refactor from 3-file site to modular architecture)
  
- **MINOR (x.X.0)**: Major feature additions
  - Example: Adding phonetic voice reader, new subrace support, complex mode
  
- **PATCH (x.x.X)**: Bug fixes, minor enhancements, small updates
  - Example: UI tweaks, performance improvements, small fixes, styling updates

## How to Bump Version

### Quick Commands

```bash
# Patch version (most common - for fixes and small updates)
npm run version:patch
# or simply:
npm run version

# Minor version (for new features)
npm run version:minor

# Major version (for major refactors)
npm run version:major
```

### What Gets Updated Automatically

1. **package.json** - Version number
2. **index.html** - Version display and date (line 808)
3. **CHANGELOG.md** - New version entry with date

### Manual Steps After Versioning

1. **Update CHANGELOG.md** - Add actual changes for the new version
   - Replace the placeholder "Version bump" with real changes
   - Use sections: Added, Changed, Fixed, Removed

2. **Commit changes** (if using git):
   ```bash
   git add package.json index.html CHANGELOG.md
   git commit -m "Bump version to vX.X.X"
   git tag vX.X.X
   ```

## Examples

### Example 1: Small Bug Fix
```bash
npm run version:patch
# Updates: 2.0.1 → 2.0.2
# Then edit CHANGELOG.md to add: "Fixed button border issue"
```

### Example 2: Adding New Feature
```bash
npm run version:minor
# Updates: 2.0.2 → 2.1.0
# Then edit CHANGELOG.md to add: "Added phonetic voice reader feature"
```

### Example 3: Major Refactor
```bash
npm run version:major
# Updates: 2.1.0 → 3.0.0
# Then edit CHANGELOG.md to add: "Complete architecture refactor"
```

## Current Version

Check the current version in:
- `package.json` - `"version"` field
- `index.html` - Line 808 (version display)
- `CHANGELOG.md` - Top entry

## Version History

See `CHANGELOG.md` for complete version history and changes.

