---
name: validate-live-config-workflow
description: Validate library changes, demo behavior, and database-backed integration paths in this repository. Use when testing local changes, checking the demo app, verifying CI parity, or exercising Redis/Postgres/SQLite flows.
---

# Validate Live Config Workflow

## Baseline Validation

Run the full local validation suite after substantive code changes:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The workspace now contains:

- `packages/core`
- `packages/adapter-redis`
- `packages/adapter-postgres`
- `packages/adapter-sqlite`
- `examples/demo-app`
- `nx.json`

## Local Database Setup

For Redis and Postgres paths, start local services first:

```bash
docker compose up -d
```

Useful environment variables:

- `REDIS_URL=redis://localhost:6379`
- `POSTGRES_URL=postgres://postgres:postgres@localhost:5432/live_config`
- `LIVE_CONFIG_DRIVER=sqlite|redis|postgres`

## Demo App Checks

Run the demo:

```bash
npm run demo:start
```

Or switch backends:

```bash
LIVE_CONFIG_DRIVER=redis npm run demo:start
LIVE_CONFIG_DRIVER=postgres npm run demo:start
```

Useful manual checks:

- `GET /health`
- `GET /consumer/greeting`
- `PUT /settings/message`
- `GET /settings/message?forceRefresh=true`
- `GET /settings/theme?watchIntervalMs=1000&preferPubSub=false`

## CI Parity

If a change affects integration behavior, compare it with:

- `.github/workflows/ci.yml`
- `packages/*/test/integration/`
- `docker-compose.yml`

Keep the local workflow and CI matrix aligned. If a backend is documented or demoed, decide whether it also needs CI coverage.

For Nx-specific inspection, use:

```bash
npm run nx -- show projects
npm run nx -- graph
```

## Example Triggers

- "Run the demo"
- "Verify Redis updates propagate live"
- "Check Postgres integration tests"
- "Make sure local validation matches CI"
