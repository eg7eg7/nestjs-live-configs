import Keyv from 'keyv';
import KeyvSqlite from '@keyv/sqlite';

import {
  KeyvStoreAdapter,
  type ConfigStoreAdapter,
  type StoredConfigRecord,
} from '@nestjs-live-configs/core';

export interface SqliteKeyvStoreOptions {
  uri: string;
  namespace?: string;
  table?: string;
}

export function createSqliteKeyvStore(
  options: SqliteKeyvStoreOptions,
): ConfigStoreAdapter {
  const keyv = new Keyv<StoredConfigRecord>({
    store: new KeyvSqlite({
      uri: options.uri,
      ...(options.table !== undefined
        ? {
            table: options.table,
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
