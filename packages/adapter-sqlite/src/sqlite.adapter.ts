import {
  createPollingSyncAdapter,
  type LiveConfigAdapter,
} from '@nestjs-live-configs/core';

import {
  createSqliteKeyvStore,
  type SqliteKeyvStoreOptions,
} from './sqlite-keyv-store.adapter.ts';

export type SqliteLiveConfigAdapterOptions = SqliteKeyvStoreOptions;

export function createSqliteAdapter(
  options: SqliteLiveConfigAdapterOptions,
): LiveConfigAdapter {
  const store = createSqliteKeyvStore(options);

  return {
    store,
    sync: createPollingSyncAdapter({
      store,
    }),
  };
}
