# Release Setup Checklist

This checklist describes required verification, not a claim that remote settings
are already configured. The owner handles pushes, merges, and releases.

## Local preparation

- [ ] Review the complete change and preserve unrelated work.
- [ ] Review every public path in `release-files.json` and the contents it approves.
- [ ] Run relevant app tests and linting, plus `npm run test:release`.
- [ ] Run `npm run build:site` and `npm run check:release`.
- [ ] Preview `dist/` and check all five generators.
- [ ] Keep private references and working notes out of tracked release files.

## Production settings to verify before activation

- [ ] Verify the repository identity is `bradleynelson/elf-name-generator`.
- [ ] Protect `main` and require the actual CI status check reported by GitHub.
- [ ] Do not require the manually triggered deployment job before merging.
- [ ] Disable force pushes and branch deletion for production `main`.
- [ ] Verify Pages serves `gh-pages`, folder `/ (root)`, with domain `espruar.com`.
- [ ] Verify Pages does not publish directly from the source `main` branch.
- [ ] Restrict the `production` environment to branch `main`.
- [ ] Configure the owner as an environment reviewer where supported.
- [ ] Ensure a solo owner can approve their own release run.
- [ ] Keep Actions defaults read-only; the deployment job explicitly requests
      `contents: write`. Do not enable PR creation/approval permission for this workflow.
- [ ] Keep the separate development repository's public hosting disabled.

## Owner release

- [ ] Transfer only the reviewed changes to production and record the commit.
- [ ] Confirm a normal push or merge runs CI without deploying.
- [ ] Manually run **CI/CD Pipeline** on production `main` with
      **confirm_production** checked, only when ready to publish.
- [ ] Review CI results and approve the production environment if configured.
- [ ] Verify espruar.com after the authorized deployment.

The site build is an allowlist of files, not a content-based secret scanner. Review
approved files for private content. Neither local ignore rules nor a private dev
repository guarantees that deployed contents are private.

See [Environment and Release Guide](ENVIRONMENT_SETUP.md) for commands and
[Branch Protection Setup Guide](BRANCH_PROTECTION_SETUP.md) for merge controls.
