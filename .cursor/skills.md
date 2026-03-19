# Cursor Usage Guide

This repository includes a NestJS library, a demo app, CI workflows, and release automation. Use this file as the quick-start guide when working on the project in Cursor.

## What This Repo Does

`nestjs-live-configs` provides a live configuration module for NestJS.

Core expectations:

- define settings with `defineConfig()`
- register the module with `LiveConfigModule.forRoot()` or `forRootAsync()`
- read values through `LiveConfigService` or `LiveConfigRef`
- prefer pub/sub sync when the backend supports it
- use polling only as a fallback

Do not treat config values as boot-time constants in consuming services. The intended model is fresh reads with module defaults plus per-call overrides.

## Common Commands

Install dependencies:

```bash
npm install
```

Run the standard validation suite:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run the demo app:

```bash
npm run demo:start
```

Run the demo against Redis:

```bash
LIVE_CONFIG_DRIVER=redis npm run demo:start
```

Run the demo against Postgres:

```bash
LIVE_CONFIG_DRIVER=postgres npm run demo:start
```

Bring up local databases:

```bash
docker compose up -d
```

## Recommended Implementation Habits

When changing the library:

- keep `LiveConfigService` as the main consumer-facing abstraction
- preserve the distinction between storage adapters and sync adapters
- keep pub/sub as the default preference for live updates
- add or update tests for any behavior change
- add a changeset for user-facing changes with `npm run changeset`

When adding a new backend:

- expose a store adapter through the Keyv-based abstraction
- add a sync adapter if the backend supports push-based invalidation
- document the backend in `README.md`
- add integration coverage when practical

## Recommended Cursor Settings

These are recommended editor settings for this repository. They are not applied automatically.

Example JSON:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
```

Useful optional extensions:

- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `ms-azuretools.vscode-docker`

## Shared Project Skills

This repo now includes shared project skills under `.cursor/skills/`.

Available skills:

- `add-live-config-adapter`: for adding or extending store/sync adapters and their tests/docs
- `release-with-changesets`: for versioning and release workflow changes
- `validate-live-config-workflow`: for local validation, demo checks, and DB-backed integration verification

When adding more shared skills, use the same layout:

```text
.cursor/skills/<skill-name>/SKILL.md
```
