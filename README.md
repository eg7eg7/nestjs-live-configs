# `nestjs-live-configs`

Nx monorepo for a split NestJS live-configuration system.

The core rule is unchanged: consuming services should resolve settings through `LiveConfigService` or `LiveConfigRef`, not by injecting boot-time primitive values. That keeps reads fresh when configuration changes at runtime.

## Packages

This repo is split so consumers install only the backend packages they need.

- `@nestjs-live-configs/core`: Nest module, service, config definition helpers, unified adapter contracts, noop sync, polling sync, and generic `KeyvStoreAdapter`
- `@nestjs-live-configs/adapter-mongo`: MongoDB Keyv store plus polling-oriented adapter bundle
- `@nestjs-live-configs/adapter-redis`: Redis Keyv store plus Redis pub/sub sync
- `@nestjs-live-configs/adapter-postgres`: Postgres Keyv store plus `LISTEN`/`NOTIFY` sync
- `@nestjs-live-configs/adapter-sqlite`: SQLite Keyv store plus polling-oriented adapter bundle

## Why The Split

The old all-in-one package forced consumers to install Redis, Postgres, SQLite, and MongoDB-related packages even when they only needed one backend.

The current structure keeps:

- the core service API backend-agnostic
- backend-specific dependencies out of the core package
- adapter creation standardized through a unified `LiveConfigAdapter` interface

## Core Features

- unified `ConfigStoreAdapter` and `ConfigSyncAdapter` contracts
- optional unified `adapter` bundle for module registration
- pub/sub-first synchronization when the backend supports it
- polling fallback when push-based invalidation is unavailable
- module-level read defaults plus per-call overrides
- strict TypeScript with `strictNullChecks`
- dual ESM and CommonJS output per published package

## Installation

Install the core package and only the adapter packages you need.

Redis example:

```bash
npm install @nestjs-live-configs/core @nestjs-live-configs/adapter-redis
```

Postgres example:

```bash
npm install @nestjs-live-configs/core @nestjs-live-configs/adapter-postgres
```

SQLite example:

```bash
npm install @nestjs-live-configs/core @nestjs-live-configs/adapter-sqlite
```

MongoDB example:

```bash
npm install @nestjs-live-configs/core @nestjs-live-configs/adapter-mongo
```

In a real Nest app you will also need the usual Nest peer dependencies:

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

## Basic Usage

Define configs once:

```ts
import { defineConfig } from '@nestjs-live-configs/core';

export const welcomeMessageConfig = defineConfig<string>({
  key: 'app.welcome-message',
  defaultValue: 'Hello world',
});
```

Register the module with a unified adapter bundle:

```ts
import { Module } from '@nestjs/common';
import { LiveConfigModule } from '@nestjs-live-configs/core';
import { createRedisAdapter } from '@nestjs-live-configs/adapter-redis';

@Module({
  imports: [
    LiveConfigModule.forRoot({
      adapter: createRedisAdapter({
        uri: 'redis://localhost:6379',
        namespace: 'my-app',
        channel: 'live-config:changes',
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
import { LiveConfigService } from '@nestjs-live-configs/core';

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

## Advanced Custom Adapters

If you need a backend that does not have a published adapter package yet, build against the core contracts:

- `ConfigStoreAdapter`
- `ConfigSyncAdapter`
- `LiveConfigAdapter`

The core package also exports `createKeyvStore()` and `KeyvStoreAdapter` for wrapping a custom `Keyv` instance without pulling Redis/Postgres/SQLite/MongoDB dependencies into the core package.

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
- clamp unsafe polling and staleness values to bounded ranges before using them

If you open a long-lived polling ref, close it when you are done:

```ts
const ref = liveConfig.ref(myConfig, {
  preferPubSub: false,
  watchIntervalMs: 1_000,
});

try {
  const value = await ref.get();
} finally {
  await ref.close();
}
```

## Demo App

The demo app lives in `examples/demo-app`.

The demo is intentionally local-development only. It now uses Nest DTO validation and binds to `127.0.0.1` by default, but it still should not be treated as production-ready authentication or admin tooling.

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

Run the demo with MongoDB:

```bash
LIVE_CONFIG_DRIVER=mongo npm run demo:start
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

## Security Notes

Treat access to the backing store and the sync transport as privileged.

- Anyone who can write to the Redis or Postgres sync channel can trigger refresh attempts for known config keys.
- The Redis/Postgres adapters now ignore malformed change events, but channel access should still be protected as tightly as write access to the config store itself.
- Postgres channel names are restricted to safe identifier-style values before `LISTEN` or `UNLISTEN` is used.
- Unknown keys from pub/sub are ignored so arbitrary events cannot grow the cache through blind refreshes.

## Repository Layout

- `packages/core`
- `packages/adapter-mongo`
- `packages/adapter-redis`
- `packages/adapter-postgres`
- `packages/adapter-sqlite`
- `examples/demo-app`
- `nx.json`

## Local Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Useful Nx commands:

```bash
npm run nx -- show projects
npm run nx -- graph
npm run nx -- test @nestjs-live-configs/core
```

Pre-commit hooks run Prettier and ESLint through `lint-staged`.

## Cursor Workflow

Project-specific Cursor guidance lives in `.cursor/skills.md`.

That file covers:

- the Nx workspace layout and package split
- the validation commands to run after code changes
- the preferred live-sync model for new adapters and features
- recommended editor and Cursor settings for this repo

Shared project skills live in `.cursor/skills/`.

## CI And Releases

- `.github/workflows/ci.yml` runs Nx-powered lint, typecheck, build, core unit tests, and adapter integration tests
- `.github/workflows/release.yml` runs on pushes to `main` and uses Changesets for multi-package versioning and publishing

To prepare a user-facing change for release:

```bash
npm run changeset
```

When unpublished changesets reach `main`, the release workflow opens or updates the release PR. When versioned release commits land on `main`, the workflow publishes changed packages using `NPM_TOKEN`.

## Dependency Updates

Dependabot configuration lives in `.github/dependabot.yml`.

It is set up to check:

- npm workspace dependencies
- GitHub Actions versions
- Docker Compose image references
