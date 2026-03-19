import type { LiveConfigAdapter } from '@nestjs-live-configs/core';

import {
  createPostgresKeyvStore,
  type PostgresKeyvStoreOptions,
} from './postgres-keyv-store.adapter.ts';
import { createPostgresSyncAdapter } from './postgres-sync.adapter.ts';

export interface PostgresLiveConfigAdapterOptions extends PostgresKeyvStoreOptions {
  connectionString?: string;
  channel?: string;
}

export function createPostgresAdapter(
  options: PostgresLiveConfigAdapterOptions,
): LiveConfigAdapter {
  return {
    store: createPostgresKeyvStore(options),
    sync: createPostgresSyncAdapter({
      connectionString: options.connectionString ?? options.uri,
      channel: options.channel,
    }),
  };
}
