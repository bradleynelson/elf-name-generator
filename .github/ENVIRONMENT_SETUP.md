# Environment and Release Guide

The application is a static website. The separate development repository is for
local preparation; production publication requires the owner's explicit release.
These instructions describe the workflow in this checkout. Verify remote settings
before enabling it in production; a local change does not activate GitHub controls.

## Website contents

`release-files.json` is the explicit list of approved public files: the page,
stylesheet, icons, license, production domain, runtime JavaScript, and naming data.
`npm run build:site` copies only these files into `dist/` and adds an empty
`.nojekyll`. It does not bundle or transform application behavior.

The build and `npm run check:release` reject missing files, unapproved extra files,
links, malformed JSON, changed copies, unexpected domains, and missing literal
asset references. An extra file in an existing `dist/` stops the rebuild for
inspection; the builder does not delete it. Add new public assets individually to
the release list after reviewing their contents and dependencies.

These checks enforce the file boundary, not the privacy of every string inside an
approved file. Review code and naming data before releasing. New dynamically
constructed asset paths need an explicit check and preview; the dependency scanner
covers the current literal references, not every possible JavaScript expression.

## Local verification

Use the project's existing Node/npm runtime and lockfile:

```sh
npm run test:run
npm run lint
npm run test:release
npm run build:site
npm run check:release
python -m http.server 8174 --bind 127.0.0.1 --directory dist
```

Preview the packaged website at <http://127.0.0.1:8174> and check all five generators.
Keep private notes, source documents, tools, dependencies, and tests out of `dist/`.
Generated output is ignored by Git. Preparing it does not authorize publication.

## CI and production release

Pushes and pull requests to `main` or `develop` run checks without deploying.
Ordinary CI has read-only repository permissions. Development hosting is disabled.
The deployment job alone has repository write permission and is serialized.

After the owner transfers the reviewed changes to the production repository:

1. Verify GitHub Pages serves `gh-pages` from its root, not `main` from the
   repository root. Keep the domain `espruar.com`.
2. Configure the `production` environment for branch `main` only and an owner
   reviewer where supported. A solo owner must be able to approve their own run;
   do not enable a self-review prohibition that would prevent this.
3. Verify branch protections and select the actual CI check name GitHub reports.
   Do not require the deployment job as a pull-request merge check.
4. Review the production `main` commit and release file list.
5. In Actions, manually run **CI/CD Pipeline** on `main` with
   **confirm_production** checked. The default is unchecked.
6. Approve the environment if configured, then verify the published website.

Deployment is allowed only for `bradleynelson/elf-name-generator`, branch `main`,
a manual workflow dispatch, explicit confirmation, and passing checks. The deploy
job checks out that run's commit, builds and verifies `dist/`, and publishes only
`dist/` through the existing GitHub Pages action.

Remote environment approvals and Pages settings must be configured on GitHub;
referencing an environment in YAML does not create its reviewer protection.
The workflow must be present on the default branch before manual dispatch is
available. If Pages still serves `main` directly, its publication behavior can
bypass the manual deployment job. Verify this before transferring release changes.

Official references:

- [Manual workflow triggers and job permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Production environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
