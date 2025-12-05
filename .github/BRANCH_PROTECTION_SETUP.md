# Branch Protection Setup Guide

This guide explains how to configure branch protection rules in GitHub to ensure safe deployments.

## Required GitHub Settings

### 1. Branch Protection for `main` (Production)

**Path:** Repository Settings → Branches → Add rule → Branch name pattern: `main`

**Required Settings:**
- ✅ **Require a pull request before merging**
  - Require approvals: **1** (or more if you have multiple reviewers)
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from Code Owners (if you set up CODEOWNERS)
  
- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Status checks required:
    - `test / Run Tests`
    - `deploy-prod / Deploy to Production` (optional, but recommended)
  
- ✅ **Require conversation resolution before merging**
  
- ✅ **Do not allow bypassing the above settings**
  - Even administrators should follow these rules
  
- ✅ **Restrict who can push to matching branches**
  - Only allow specific people/teams (optional, but recommended for production)

### 2. Branch Protection for `develop` (Development)

**Path:** Repository Settings → Branches → Add rule → Branch name pattern: `develop`

**Recommended Settings:**
- ✅ **Require a pull request before merging** (optional, but recommended)
  - Require approvals: **0** (or 1 if you want basic review)
  
- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Status checks required:
    - `test / Run Tests`
  
- ⚠️ **Allow force pushes** (optional, for flexibility during development)
- ⚠️ **Allow deletions** (optional, for flexibility during development)

### 3. GitHub Pages Configuration

**Path:** Repository Settings → Pages

**Current Setup:**
- Source: Deploy from a branch
- Branch: `main` (or `gh-pages` if using the deploy action)
- Folder: `/ (root)`

**For Separate Dev Environment:**
- You can create a separate GitHub Pages site from the `develop` branch
- Or use a different repository for development
- Or use a subdomain (dev.espruar.com) if you configure DNS

### 4. Environment Secrets (if needed)

**Path:** Repository Settings → Environments

**Production Environment:**
- Name: `production`
- Protection rules: Require reviewers (optional)
- Deployment branches: Only `main` branch

**Development Environment:**
- Name: `development`
- Protection rules: None (or minimal)
- Deployment branches: Only `develop` branch

## Workflow

### Development Workflow
1. Create feature branch from `develop`
2. Make changes and commit
3. Push to feature branch
4. Create Pull Request to `develop`
5. Tests run automatically
6. After approval, merge to `develop`
7. `develop` branch tests and (optionally) deploys to dev environment

### Production Workflow
1. When `develop` is stable, create Pull Request from `develop` to `main`
2. Tests run automatically
3. Require at least 1 approval
4. After approval, merge to `main`
5. `main` branch tests and deploys to production (espruar.com)

## Quick Setup Checklist

- [ ] Set up branch protection for `main`
- [ ] Set up branch protection for `develop`
- [ ] Configure GitHub Pages source
- [ ] Set up environments (production/development)
- [ ] Test the workflow by creating a test PR
- [ ] Verify tests run on PR creation
- [ ] Verify deployment works on merge to `main`

## Notes

- The `main` branch should always be deployable to production
- The `develop` branch is for active development
- Feature branches should branch from `develop`, not `main`
- Hotfixes can branch from `main` if needed, then merge back to both branches

