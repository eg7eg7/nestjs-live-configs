# `nestjs-live-configs`

Runtime-editable configuration for NestJS applications.

This library lets you store app settings in Redis, Postgres, SQLite, or MongoDB, read them through a typed Nest service, and have running app instances see changes without a restart. It is meant for values like feature flags, UI text, throttling thresholds, tenant settings, and operational toggles that should change after boot.

If your configuration only comes from environment variables and only changes on deploy, this is probably not the tool you need. If you want typed config definitions, shared storage, and live refresh behavior across running Nest services, this library is built for that.

## What It Does

- defines config keys in TypeScript with defaults, validation, and optional custom serialization
- reads config values through `LiveConfigService` or `LiveConfigRef`
- stores values in a shared backend instead of freezing them at app startup
- refreshes values through pub/sub when the backend supports it, or polling when it does not
- keeps the core Nest integration backend-agnostic so you only install the adapter you need

## When This Library Fits

Use it if:

- you need some settings to change without restarting your Nest app
- you run multiple instances and want config updates to propagate between them
- you want config values to be typed, validated, and supplied with safe defaults
- you are building your own admin endpoint or UI for changing settings at runtime

Probably not a fit if:

- all configuration comes from `.env` or deployment-time secrets
- your values never change while the process is running
- you do not want a backing store for shared config state
- you are looking for a complete admin dashboard, auth layer, or policy system

## How It Works

1. Define a config key once with `defineConfig()`.
2. Register `LiveConfigModule` with a store adapter and optional sync adapter bundle.
3. Read values through `LiveConfigService.get()` or a reusable `LiveConfigRef`.
4. Update values through `LiveConfigService.set()` or your own write path, and other instances refresh through pub/sub or polling.

The important design rule is simple: consumer code should read through `LiveConfigService` or `LiveConfigRef`, not by injecting primitive values at boot time. That is what keeps reads fresh after runtime updates.

## Packages

This repo is split so consumers install only the backend packages they need.

| Package                                 | Backend  | Sync model                       | Good fit                                                    |
| --------------------------------------- | -------- | -------------------------------- | ----------------------------------------------------------- |
| `@nestjs-live-configs/core`             | none     | noop, polling helpers, contracts | Required in every setup                                     |
| `@nestjs-live-configs/adapter-redis`    | Redis    | Redis pub/sub                    | Best when you already use Redis and want push-based updates |
| `@nestjs-live-configs/adapter-postgres` | Postgres | `LISTEN`/`NOTIFY`                | Good when Postgres is already your shared system of record  |
| `@nestjs-live-configs/adapter-sqlite`   | SQLite   | polling                          | Simple local or single-node setups                          |
| `@nestjs-live-configs/adapter-mongo`    | MongoDB  | polling                          | Good when Mongo is your existing storage backend            |

## Requirements

- Node.js `>=20`
- NestJS `>=10`
- peer dependencies: `@nestjs/common`, `@nestjs/core`, `reflect-metadata`, `rxjs`

## Installation

Install the core package and only the adapter package you want.

Redis:

```bash
npm install @nestjs-live-configs/core @nestjs-live-configs/adapter-redis
```

Postgres:

```bash
npm install @nestjs-live-configs/core @nestjs-live-configs/adapter-postgres
```

SQLite:

```bash
npm install @nestjs-live-configs/core @nestjs-live-configs/adapter-sqlite
```

MongoDB:

```bash
npm install @nestjs-live-configs/core @nestjs-live-configs/adapter-mongo
```

Nest peer dependencies:

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

## Quick Start

Define a config:

```ts
import { defineConfig } from '@nestjs-live-configs/core';

export const welcomeMessageConfig = defineConfig<string>({
  key: 'app.welcome-message',
  description: 'Message returned by the greeting endpoint',
  defaultValue: 'Hello world',
  validate: (value) => {
    if (value.trim().length === 0) {
      throw new Error('app.welcome-message cannot be empty');
    }
  },
});
```

Register the module with an adapter:

```ts
import { Module } from '@nestjs/common';
import { LiveConfigModule } from '@nestjs-live-configs/core';
import { createRedisAdapter } from '@nestjs-live-configs/adapter-redis';

@Module({
  imports: [
    LiveConfigModule.forRoot({
      adapter: createRedisAdapter({
        uri: 'redis://127.0.0.1:6379',
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

Read and update values through the service:

```ts
import { Injectable } from '@nestjs/common';
import { LiveConfigService } from '@nestjs-live-configs/core';

@Injectable()
export class GreetingService {
  public constructor(private readonly liveConfig: LiveConfigService) {}

  public async getMessage(): Promise<string> {
    return this.liveConfig.get(welcomeMessageConfig);
  }

  public async getFreshMessage(): Promise<string> {
    return this.liveConfig.get(welcomeMessageConfig, {
      forceRefresh: true,
    });
  }

  public async updateMessage(message: string): Promise<string> {
    return this.liveConfig.set(welcomeMessageConfig, message);
  }
}
```

For repeated reads, keep a reusable ref:

```ts
const welcomeMessageRef = this.liveConfig.ref(welcomeMessageConfig, {
  preferPubSub: true,
});

const message = await welcomeMessageRef.get();
```

## Read Behavior

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
- use polling when push-based invalidation is unavailable
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

## Custom Adapters

If you need a backend that does not have a published adapter package yet, build against the core contracts:

- `ConfigStoreAdapter`
- `ConfigSyncAdapter`
- `LiveConfigAdapter`

The core package also exports `createKeyvStore()` and `KeyvStoreAdapter` for wrapping a custom `Keyv` instance without pulling Redis, Postgres, SQLite, or MongoDB dependencies into the core package.

## Demo App

The demo app lives in `examples/demo-app`.

It is useful for understanding the request flow, adapter setup, and update behavior, but it is intentionally local-development only. It should not be treated as production-ready authentication or admin tooling.

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

Example update request:

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

- anyone who can write to the Redis or Postgres sync channel can trigger refresh attempts for known config keys
- Redis and Postgres adapters ignore malformed change events, but channel access should still be protected as tightly as write access to the config store itself
- Postgres channel names are restricted to safe identifier-style values before `LISTEN` or `UNLISTEN` is used
- unknown keys from pub/sub are ignored so arbitrary events cannot grow the cache through blind refreshes

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
