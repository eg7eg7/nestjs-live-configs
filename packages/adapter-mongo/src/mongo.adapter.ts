import {
  createPollingSyncAdapter,
  type LiveConfigAdapter,
} from '@nestjs-live-configs/core';

import {
  createMongoKeyvStore,
  type MongoKeyvStoreOptions,
} from './mongo-keyv-store.adapter.ts';

export type MongoLiveConfigAdapterOptions = MongoKeyvStoreOptions;

export function createMongoAdapter(
  options: MongoLiveConfigAdapterOptions,
): LiveConfigAdapter {
  const store = createMongoKeyvStore(options);

  return {
    store,
    sync: createPollingSyncAdapter({
      store,
    }),
  };
}
