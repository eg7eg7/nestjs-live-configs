---
name: add-live-config-adapter
description: Add or update storage and sync adapters for this live-config library. Use when implementing support for a new database/backend, adding pub/sub or polling behavior, or extending adapter tests and docs.
---

# Add Live Config Adapter

## Quick Start

Use this skill when the task involves a new backend or changes to adapter behavior.

In this repo:

- the shared contracts live in `packages/core/src/`
- backend-specific packages live in `packages/adapter-*`
- storage and sync concerns stay separate
- pub/sub is preferred when the backend supports it
- polling is the fallback, not the first choice

## Required Steps

1. Decide whether the change affects:
   - store adapter only
   - sync adapter only
   - both store and sync
2. Keep the consumer API centered on `LiveConfigService` and `LiveConfigRef`.
3. Keep the core package backend-agnostic and dependency-light.
4. Export any new adapter from the relevant package `src/index.ts`.
5. Add or update tests in the relevant package under `packages/*/test/`.
6. Update `README.md` if the new backend is supported publicly.
7. If the backend should be exercised locally or in CI, update:
   - `docker-compose.yml`
   - `.github/workflows/ci.yml`
   - `examples/demo-app/` when the demo should support it

## Design Rules

- Prefer pub/sub invalidation over polling when the backend can push changes.
- Keep persistence envelopes compatible with the existing `StoredConfigRecord` shape.
- Do not bypass `LiveConfigService` by pushing backend-specific logic into consuming services.
- Keep adapter constructors small and environment-driven where practical.
- Prefer exposing a unified adapter bundle for packaged backends.
- Match the repo's strict TypeScript style and workspace layout.

## Validation Checklist

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If the adapter uses Redis or Postgres, also verify the backend-specific integration path.

## Example Triggers

- "Add Mongo support"
- "Implement pub/sub sync for a new backend"
- "Extend Keyv adapter coverage"
- "Add another database to the demo app"
