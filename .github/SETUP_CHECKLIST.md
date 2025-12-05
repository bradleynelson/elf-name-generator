# GitHub Dev/Prod Setup Checklist

This checklist covers everything you need to configure for a proper development and production environment setup.

## ✅ What's Already Done

- [x] Created GitHub Actions CI/CD workflow (`.github/workflows/ci-cd.yml`)
- [x] Created branch protection setup guide (`.github/BRANCH_PROTECTION_SETUP.md`)
- [x] Created environment setup guide (`.github/ENVIRONMENT_SETUP.md`)
- [x] Created CODEOWNERS file (`.github/CODEOWNERS`)
- [x] Created development workflow guide (`DEVELOPMENT_WORKFLOW.md`)
- [x] Local `develop` branch set up to track remote

## 🔧 What You Need to Configure in GitHub

### 1. Branch Protection Rules (CRITICAL)

**Go to:** Repository Settings → Branches

#### For `main` branch:
- [ ] Add branch protection rule for `main`
- [ ] Require pull request before merging
- [ ] Require at least 1 approval
- [ ] Require status checks to pass (select "test / Run Tests")
- [ ] Require branches to be up to date before merging
- [ ] Do not allow bypassing (even for admins)
- [ ] (Optional) Restrict who can push to matching branches

#### For `develop` branch:
- [ ] Add branch protection rule for `develop`
- [ ] (Optional) Require pull request before merging
- [ ] Require status checks to pass (select "test / Run Tests")
- [ ] Require branches to be up to date before merging
- [ ] (Optional) Allow force pushes (for flexibility)

### 2. GitHub Pages Configuration

**Go to:** Repository Settings → Pages

- [ ] Verify source is set to deploy from `main` branch (or `gh-pages` if using deploy action)
- [ ] Verify custom domain is set to `espruar.com`
- [ ] (Optional) Set up separate Pages site for `develop` branch if you want a dev preview

### 3. Environments (Optional but Recommended)

**Go to:** Repository Settings → Environments

#### Create Production Environment:
- [ ] Click "New environment"
- [ ] Name: `production`
- [ ] (Optional) Add protection rules (require reviewers)
- [ ] Deployment branches: Only `main` branch

#### Create Development Environment:
- [ ] Click "New environment"
- [ ] Name: `development`
- [ ] Deployment branches: Only `develop` branch

### 4. GitHub Actions Permissions

**Go to:** Repository Settings → Actions → General

- [ ] Verify "Workflow permissions" is set to "Read and write permissions"
- [ ] (Optional) Enable "Allow GitHub Actions to create and approve pull requests"

### 5. Repository Visibility

**Current Status:** Public repository

**Decisions Needed:**
- [ ] Keep repository public (current)
- [ ] OR make repository private and only make `main` branch public
- [ ] OR create separate private repository for development

**Note:** GitHub Pages requires public repository OR GitHub Pro/Team for private repos with Pages.

### 6. Test the Workflow

- [ ] Create a test feature branch from `develop`
- [ ] Make a small change (e.g., update README)
- [ ] Push to remote
- [ ] Create Pull Request to `develop`
- [ ] Verify tests run automatically
- [ ] Verify tests pass
- [ ] Merge the PR
- [ ] Verify `develop` branch tests run
- [ ] Create Pull Request from `develop` to `main`
- [ ] Verify tests run and pass
- [ ] Verify approval is required (if configured)
- [ ] Merge to `main`
- [ ] Verify deployment to production runs
- [ ] Check espruar.com to verify deployment

## 📋 Additional Recommendations

### Code Review Process
- [ ] Decide on review requirements (1 approval? 2?)
- [ ] Set up CODEOWNERS file (already created)
- [ ] Configure auto-request reviews from code owners

### Testing Strategy
- [ ] Ensure all tests pass locally before pushing
- [ ] Run `npm test` before creating PRs
- [ ] Consider adding pre-commit hooks (optional)

### Documentation
- [ ] Review and customize `DEVELOPMENT_WORKFLOW.md` if needed
- [ ] Share workflow guide with any collaborators
- [ ] Document any project-specific conventions

### Monitoring
- [ ] Set up notifications for failed workflows
- [ ] Monitor GitHub Actions usage (free tier has limits)
- [ ] Consider adding status badges to README

## 🚨 Important Notes

1. **Branch Protection is Critical:** Without branch protection on `main`, anyone with write access could push directly and break production.

2. **Test Before Production:** Always test changes on `develop` before merging to `main`.

3. **GitHub Actions Limits:** Free tier includes 2,000 minutes/month. Monitor usage.

4. **Deployment:** The current workflow deploys on push to `main`. Make sure this is what you want.

5. **Secrets:** If you need API keys or secrets, add them in Repository Settings → Secrets and variables → Actions.

## 🎯 Quick Start (Priority Order)

1. **Set up branch protection for `main`** (HIGHEST PRIORITY)
2. **Set up branch protection for `develop`**
3. **Test the workflow with a small PR**
4. **Configure environments** (optional)
5. **Review and customize documentation**

## 📚 Reference Documents

- `.github/BRANCH_PROTECTION_SETUP.md` - Detailed branch protection guide
- `.github/ENVIRONMENT_SETUP.md` - Environment configuration details
- `DEVELOPMENT_WORKFLOW.md` - Daily development workflow
- `.github/workflows/ci-cd.yml` - CI/CD pipeline configuration

## ❓ Need Help?

- GitHub Docs: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository
- GitHub Actions Docs: https://docs.github.com/en/actions
- Check the workflow logs if something fails: Repository → Actions tab

