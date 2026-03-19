import Keyv from 'keyv';
import KeyvMongo from '@keyv/mongo';

import {
  KeyvStoreAdapter,
  type ConfigStoreAdapter,
  type StoredConfigRecord,
} from '@nestjs-live-configs/core';

export interface MongoKeyvStoreOptions {
  uri: string;
  namespace?: string;
  collection?: string;
}

export function createMongoKeyvStore(
  options: MongoKeyvStoreOptions,
): ConfigStoreAdapter {
  const keyv = new Keyv<StoredConfigRecord>({
    store: new KeyvMongo(options.uri, {
      ...(options.collection !== undefined
        ? {
            collection: options.collection,
          }
        : {}),
    }),
    ...(options.namespace !== undefined
      ? {
          namespace: options.namespace,
        }
      : {}),
  });

  return new KeyvStoreAdapter(keyv);
}
