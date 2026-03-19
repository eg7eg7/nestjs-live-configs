# `@nestjs-live-configs/core`

Core NestJS live configuration package.

This package contains:

- `LiveConfigModule`
- `LiveConfigService`
- `LiveConfigRef`
- config definition helpers
- unified `ConfigStoreAdapter` and `ConfigSyncAdapter` contracts
- generic helpers such as noop sync, polling sync, and `KeyvStoreAdapter`

Install this package together with one or more adapter packages such as:

- `@nestjs-live-configs/adapter-redis`
- `@nestjs-live-configs/adapter-postgres`
- `@nestjs-live-configs/adapter-sqlite`
