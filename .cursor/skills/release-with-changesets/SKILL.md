---
name: release-with-changesets
description: Prepare releases for this repository with Changesets. Use when the user asks to version the package, prepare a release PR, publish from main, or update release-related documentation and workflows.
---

# Release With Changesets

## Quick Start

This repo uses Changesets plus GitHub Actions for multi-package releases.

Important files:

- `.changeset/config.json`
- `.changeset/README.md`
- `.github/workflows/release.yml`
- `package.json`
- `packages/*/package.json`

## Standard Workflow

1. Determine whether the change is user-facing.
2. If yes, add a changeset with:

```bash
npm run changeset
```

3. Validate the repo before release-related edits are finished:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

4. Keep release docs consistent across:
   - `README.md`
   - `.changeset/README.md`
   - `.github/workflows/release.yml`

## Rules

- Do not invent custom versioning flows when the existing Changesets flow is sufficient.
- Prefer explaining whether a change needs a changeset instead of silently skipping it.
- If release automation changes, make sure CI and release docs still match the actual scripts in `package.json`.
- Keep release PR and publish behavior aligned with pushes to `main`.
- Remember that the demo app is private and should stay out of published package releases.

## When To Update Release Config

Edit release-related files when the task changes:

- publish commands
- package metadata used for releases
- Changesets behavior
- release workflow permissions or secrets

## Example Triggers

- "Prepare a release"
- "Add a changeset"
- "Update versioning"
- "Fix the GitHub release workflow"
