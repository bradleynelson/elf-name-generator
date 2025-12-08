# Development Workflow Guide

This guide explains how to work with the development and production branches.

## Branch Strategy

### Branches Overview

- **`main`** - Production branch, always stable, deployed to espruar.com
- **`develop`** - Development branch, active development happens here
- **`feature/*`** - Feature branches for new features
- **`hotfix/*`** - Hotfix branches for urgent production fixes

## Getting Started

### 1. Set Up Local Development

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/bradleynelson/elf-name-generator.git
cd elf-name-generator

# Fetch all branches
git fetch origin

# Checkout and track the develop branch
git checkout -b develop origin/develop

# Install dependencies
npm install
```

### 2. Daily Development Workflow

#### Starting a New Feature

```bash
# Make sure you're on develop and it's up to date
git checkout develop
git pull origin develop

# Create a new feature branch
git checkout -b feature/your-feature-name

# Make your changes, then commit
git add .
git commit -m "Add: description of your changes"

# Push to remote
git push origin feature/your-feature-name
```

#### Creating a Pull Request

1. Go to GitHub and create a Pull Request from `feature/your-feature-name` to `develop`
2. Tests will run automatically
3. Wait for approval (if required)
4. Merge the PR
5. Delete the feature branch after merging

#### Updating Develop

```bash
# After merging your PR, update your local develop
git checkout develop
git pull origin develop
```

### 3. Deploying to Production

When `develop` is stable and ready for production:

```bash
# Make sure develop is up to date
git checkout develop
git pull origin develop

# Create a PR from develop to main on GitHub
# Or use command line:
git checkout main
git pull origin main
git merge develop
git push origin main
```

**Important:** Always use a Pull Request to merge `develop` → `main` so that:

- Tests run automatically
- You can review changes
- Branch protection rules are enforced

## Testing

### Run Tests Locally

```bash
# Run all tests
npm test

# Run tests once (no watch mode)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Checklist Before Production

- [ ] All tests pass (`npm test`)
- [ ] Manual testing in browser
- [ ] Check accessibility (keyboard navigation, screen readers)
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Verify no console errors
- [ ] Check that favorites still work
- [ ] Verify all subrace options work correctly

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
Add: New feature description
Fix: Bug description
Update: Change description
Refactor: Refactoring description
Docs: Documentation update
Test: Test addition/update
```

Examples:

- `Add: Drow component expansion to 30+ components`
- `Fix: Phonetic flow issue with liquid consonants`
- `Update: Improve accessibility for screen readers`
- `Refactor: Extract phonetics logic to separate module`

## Version Management

Use the version scripts to bump versions:

```bash
# Patch version (1.0.0 → 1.0.1) - bug fixes
npm run version:patch

# Minor version (1.0.0 → 1.1.0) - new features
npm run version:minor

# Major version (1.0.0 → 2.0.0) - breaking changes
npm run version:major
```

Version updates will:

- Update `package.json`
- Update `CHANGELOG.md`
- Create a git commit with the version change

## Troubleshooting

### Tests Failing

1. Check the test output for specific errors
2. Run tests locally: `npm test`
3. Check if you need to update test expectations
4. Verify your changes don't break existing functionality

### Merge Conflicts

```bash
# If you have conflicts when merging
git checkout develop
git pull origin develop
git checkout your-feature-branch
git merge develop
# Resolve conflicts, then:
git add .
git commit -m "Resolve merge conflicts"
```

### Deployment Issues

1. Check GitHub Actions logs
2. Verify branch protection rules aren't blocking
3. Ensure all required status checks pass
4. Check that CNAME file is correct

## Best Practices

1. **Always test locally** before pushing
2. **Keep commits focused** - one feature/fix per commit
3. **Write descriptive commit messages**
4. **Update tests** when adding new features
5. **Don't skip tests** - they catch bugs early
6. **Review your own PR** before requesting review
7. **Keep `main` stable** - only merge tested, reviewed code
8. **Use feature branches** - don't commit directly to `develop` or `main`

## Quick Reference

```bash
# Switch to develop
git checkout develop

# Create feature branch
git checkout -b feature/my-feature

# Run tests
npm test

# Commit changes
git add .
git commit -m "Add: feature description"

# Push to remote
git push origin feature/my-feature

# Update from remote
git pull origin develop

# Merge develop to main (via PR on GitHub)
```

## Getting Help

- Check `.github/BRANCH_PROTECTION_SETUP.md` for branch protection info
- Check `.github/ENVIRONMENT_SETUP.md` for environment configuration
- Review GitHub Actions logs if deployment fails
- Check test logs for test failures
