import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

import {
  KeyvStoreAdapter,
  type ConfigStoreAdapter,
  type StoredConfigRecord,
} from '@nestjs-live-configs/core';

export interface RedisKeyvStoreOptions {
  uri: string;
  namespace?: string;
}

export function createRedisKeyvStore(
  options: RedisKeyvStoreOptions,
): ConfigStoreAdapter {
  const keyv = new Keyv<StoredConfigRecord>({
    store: new KeyvRedis(options.uri),
    ...(options.namespace !== undefined
      ? {
          namespace: options.namespace,
        }
      : {}),
  });

  return new KeyvStoreAdapter(keyv);
}
