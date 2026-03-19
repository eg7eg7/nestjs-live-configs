import {
  type LiveConfigAdapter,
  type LiveConfigDefaultOptions,
} from '@nestjs-live-configs/core';
import { createPostgresAdapter } from '@nestjs-live-configs/adapter-postgres';
import { createRedisAdapter } from '@nestjs-live-configs/adapter-redis';
import { createSqliteAdapter } from '@nestjs-live-configs/adapter-sqlite';

type DemoDriver = 'sqlite' | 'redis' | 'postgres';

export interface DemoBackend {
  driver: DemoDriver;
  defaults: LiveConfigDefaultOptions;
  adapter: LiveConfigAdapter;
}

export function createDemoBackend(env: NodeJS.ProcessEnv): DemoBackend {
  const description = describeDemoBackend(env);

  if (description.driver === 'redis') {
    return {
      ...description,
      adapter: createRedisAdapter({
        uri: env.LIVE_CONFIG_REDIS_URL ?? 'redis://localhost:6379',
        namespace: env.LIVE_CONFIG_NAMESPACE ?? 'demo-app',
        channel: env.LIVE_CONFIG_CHANNEL ?? 'demo-live-config',
      }),
    };
  }

  if (description.driver === 'postgres') {
    return {
      ...description,
      adapter: createPostgresAdapter({
        uri:
          env.LIVE_CONFIG_POSTGRES_URL ??
          'postgres://postgres:postgres@localhost:5432/live_config',
        namespace: env.LIVE_CONFIG_NAMESPACE ?? 'demo-app',
        table: env.LIVE_CONFIG_POSTGRES_TABLE ?? 'live_config_values',
        channel: env.LIVE_CONFIG_CHANNEL ?? 'demo_live_config',
      }),
    };
  }

  return {
    ...description,
    adapter: createSqliteAdapter({
      uri:
        env.LIVE_CONFIG_SQLITE_URI ?? 'sqlite://./tmp/live-config-demo.sqlite',
      namespace: env.LIVE_CONFIG_NAMESPACE ?? 'demo-app',
      table: env.LIVE_CONFIG_SQLITE_TABLE ?? 'live_config_values',
    }),
  };
}

export function describeDemoBackend(
  env: NodeJS.ProcessEnv,
): Pick<DemoBackend, 'defaults' | 'driver'> {
  const driver = parseDriver(env.LIVE_CONFIG_DRIVER);
  const defaults = createDefaultReadOptions(env);

  return {
    driver,
    defaults,
  };
}

function parseDriver(value: string | undefined): DemoDriver {
  if (value === 'redis' || value === 'postgres' || value === 'sqlite') {
    return value;
  }

  return 'sqlite';
}

function createDefaultReadOptions(
  env: NodeJS.ProcessEnv,
): LiveConfigDefaultOptions {
  return {
    forceRefreshOnRead: parseBoolean(env.LIVE_CONFIG_FORCE_REFRESH_ON_READ),
    preferPubSub: parseBoolean(env.LIVE_CONFIG_PREFER_PUBSUB) ?? true,
    staleTtlMs: parseNumber(env.LIVE_CONFIG_STALE_TTL_MS),
    watchIntervalMs: parseNumber(env.LIVE_CONFIG_WATCH_INTERVAL_MS),
  };
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === 'true';
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
