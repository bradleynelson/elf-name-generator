# Checks and releases

## What runs

- **CI/CD Pipeline** (`workflows/ci-cd.yml`), on pull requests to `main`, pushes to `main`, `develop` and
  `feature/**`, and by hand:
    - **Run Tests:** `npm ci`, `npm audit` (high or critical advisories fail the run), then `npm run check`—lint,
      Prettier, duplication and unused-code checks, coverage-gated tests, release safeguards, and a verified build.
    - **Deploy to Production:** only in `bradleynelson/elf-name-generator`, only for `main`, after Run Tests passes, on
      a push (a merged pull request) or a manual run with the confirm box ticked. It publishes `dist/` through GitHub
      Pages, then `scripts/check-live-site.js` checks espruar.com: the page shows the new version, every approved file
      loads, and every other repository file returns 404.
- **Weekly Lighthouse check** (`workflows/lighthouse.yml`): Mondays and by hand, against espruar.com. Accessibility
  below the threshold in `lighthouserc.json` fails the run; the reports are kept as a run artifact.
- **Dependabot** (`dependabot.yml`): one grouped pull request a week for npm packages and one for GitHub Actions,
  skipping releases less than a week old. Security updates open as soon as an alert appears.

Every action is pinned to a full commit SHA, with its version in a comment.

## What is published

Only the files listed in `release-files.json`. `npm run build:site` copies them into `dist/` and refuses
symbolic links, unapproved or missing files, unexpected domains, and references to files that are not approved;
`npm run check:release` verifies the result. To publish a new file, add it to the list after reviewing it.

## Repository settings this relies on

- **Pages:** Source "GitHub Actions"; custom domain `espruar.com` with HTTPS enforced.
- **Environment `github-pages`:** deployments limited to `main`.
- **Branch `main`:** pull request required with zero approvals, the up-to-date **Run Tests** check required for the
  owner too, no force pushes or deletion. A solo owner cannot approve their own pull request.
- Dependabot alerts and security updates, secret scanning and push protection on.

## Release steps

1. Add the changes to `CHANGELOG.md` under [Unreleased] as they land.
2. `node scripts/version.js patch` (or `minor`): updates `package.json`, `package-lock.json`, the footer and every
   `?v=` cache stamp, and turns [Unreleased] into the new version.
3. Open a pull request into `main`; merge it when Run Tests is green. The merge publishes the site.

To roll back, revert the merged pull request; merging the revert publishes the previous version.
