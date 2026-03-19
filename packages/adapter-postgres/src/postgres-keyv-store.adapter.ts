import Keyv from 'keyv';
import KeyvPostgres from '@keyv/postgres';

import {
  KeyvStoreAdapter,
  type ConfigStoreAdapter,
  type StoredConfigRecord,
} from '@nestjs-live-configs/core';

export interface PostgresKeyvStoreOptions {
  uri: string;
  namespace?: string;
  table?: string;
  schema?: string;
  useUnloggedTable?: boolean;
}

export function createPostgresKeyvStore(
  options: PostgresKeyvStoreOptions,
): ConfigStoreAdapter {
  const keyv = new Keyv<StoredConfigRecord>({
    store: new KeyvPostgres({
      uri: options.uri,
      ...(options.table !== undefined
        ? {
            table: options.table,
          }
        : {}),
      ...(options.schema !== undefined
        ? {
            schema: options.schema,
          }
        : {}),
      ...(options.useUnloggedTable !== undefined
        ? {
            useUnloggedTable: options.useUnloggedTable,
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
