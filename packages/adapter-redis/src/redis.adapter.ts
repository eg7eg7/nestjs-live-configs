import type { LiveConfigAdapter } from '@nestjs-live-configs/core';

import {
  createRedisKeyvStore,
  type RedisKeyvStoreOptions,
} from './redis-keyv-store.adapter.ts';
import {
  createRedisSyncAdapter,
  type RedisSyncAdapterOptions,
} from './redis-sync.adapter.ts';

export interface RedisLiveConfigAdapterOptions
  extends RedisKeyvStoreOptions, RedisSyncAdapterOptions {}

export function createRedisAdapter(
  options: RedisLiveConfigAdapterOptions,
): LiveConfigAdapter {
  return {
    store: createRedisKeyvStore(options),
    sync: createRedisSyncAdapter(options),
  };
}
