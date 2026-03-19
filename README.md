# `nestjs-live-configs`

A NestJS module for live configuration values backed by a database through Keyv adapters.

The module is designed around one rule: consumers should resolve configuration through `LiveConfigService` or `LiveConfigRef`, not by injecting a primitive value at startup. That keeps reads fresh when settings change at runtime.

## Features

- Keyv-backed storage so the persistence layer can be swapped behind a common adapter contract.
- Pub/sub-first synchronization for backends that support it.
- Polling fallback for backends that cannot push invalidations.
- Module-level read defaults plus per-call overrides.
- Strict TypeScript configuration with `strictNullChecks`.
- Dual package output for both ESM and CommonJS consumers.
- Demo Nest app and local Docker services for Redis and Postgres.

## Supported Backends

This package exports helpers for:

- SQLite via `createSqliteKeyvStore()`
- Redis via `createRedisKeyvStore()` and `createRedisSyncAdapter()`
- Postgres via `createPostgresKeyvStore()` and `createPostgresSyncAdapter()`

You can also wrap any custom `Keyv` instance with `createKeyvStore()`.

## Installation

```bash
npm install nestjs-live-configs
```

In a real Nest app you will also need the usual Nest peer dependencies:

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

## Basic Usage

Define configs once:

```ts
import { defineConfig } from 'nestjs-live-configs';

export const welcomeMessageConfig = defineConfig<string>({
  key: 'app.welcome-message',
  defaultValue: 'Hello world',
});
```

Register the module with service defaults:

```ts
import {
  LiveConfigModule,
  createRedisKeyvStore,
  createRedisSyncAdapter,
} from 'nestjs-live-configs';

@Module({
  imports: [
    LiveConfigModule.forRoot({
      store: createRedisKeyvStore({
        uri: 'redis://localhost:6379',
        namespace: 'my-app',
      }),
      sync: createRedisSyncAdapter({
        uri: 'redis://localhost:6379',
      }),
      defaults: {
        preferPubSub: true,
        forceRefreshOnRead: false,
        watchIntervalMs: 2_000,
      },
    }),
  ],
})
export class AppModule {}
```

Consume values through the service:

```ts
import { Injectable } from '@nestjs/common';
import { LiveConfigService } from 'nestjs-live-configs';

@Injectable()
export class GreetingService {
  constructor(private readonly liveConfig: LiveConfigService) {}

  async getMessage(): Promise<string> {
    return this.liveConfig.get(welcomeMessageConfig);
  }

  async getFreshMessage(): Promise<string> {
    return this.liveConfig.get(welcomeMessageConfig, {
      forceRefresh: true,
    });
  }
}
```

Or keep a reusable ref:

```ts
const welcomeMessageRef = this.liveConfig.ref(welcomeMessageConfig, {
  preferPubSub: true,
});

const message = await welcomeMessageRef.get();
```

## Defaults And Per-Call Overrides

Module registration accepts defaults that apply to all reads:

- `forceRefreshOnRead`
- `watchIntervalMs`
- `staleTtlMs`
- `preferPubSub`

Each `get()` or `ref().get()` call can override those defaults:

```ts
await liveConfig.get(myConfig, {
  forceRefresh: true,
  watchIntervalMs: 1_000,
});
```

The intended behavior is:

- prefer pub/sub when the selected sync adapter supports it
- use polling when live push is not available
- fall back to read-through refreshes when no other live mechanism is configured

## Demo App

The demo app lives in `examples/demo-app`.

Start the local databases:

```bash
docker compose up -d
```

Run the demo with SQLite:

```bash
npm run demo:start
```

Run the demo with Redis:

```bash
LIVE_CONFIG_DRIVER=redis npm run demo:start
```

Run the demo with Postgres:

```bash
LIVE_CONFIG_DRIVER=postgres npm run demo:start
```

Useful endpoints:

- `GET /health`
- `GET /consumer/greeting`
- `GET /settings/message`
- `PUT /settings/message`
- `GET /settings/theme`
- `PUT /settings/theme`

Example request:

```bash
curl -X PUT http://localhost:3000/settings/message \
  -H 'content-type: application/json' \
  -d '{"value":"Hello from Redis"}'
```

Force a fresh read:

```bash
curl 'http://localhost:3000/settings/message?forceRefresh=true'
```

Ask the service to watch a setting with polling:

```bash
curl 'http://localhost:3000/settings/theme?watchIntervalMs=1000&preferPubSub=false'
```

Demo environment variables are documented in `examples/demo-app/.env.example`.

## Local Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Pre-commit hooks run Prettier and ESLint through `lint-staged`.

## Cursor Workflow

Project-specific Cursor guidance lives in `.cursor/skills.md`.

That file covers:

- the intended module usage patterns
- the validation commands to run after code changes
- the preferred live-sync model for new adapters and features
- recommended editor and Cursor settings for this repo

## CI And Releases

- `.github/workflows/ci.yml` runs lint, typecheck, build, unit tests, and integration tests for SQLite, Redis, and Postgres.
- `.github/workflows/release.yml` runs on pushes to `main` and uses Changesets for versioning and publishing.

To prepare a user-facing change for release:

```bash
npm run changeset
```

When unpublished changesets reach `main`, the release workflow will open or update the release PR. When versioned release commits land on `main`, the workflow publishes the package using `NPM_TOKEN`.

## Dependency Updates

Dependabot configuration lives in `.github/dependabot.yml`.

It is set up to check:

- npm dependencies
- GitHub Actions versions
- Docker Compose image references
