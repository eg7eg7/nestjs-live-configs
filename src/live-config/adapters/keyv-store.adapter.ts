import Keyv from 'keyv';
import KeyvPostgres from '@keyv/postgres';
import KeyvRedis from '@keyv/redis';
import KeyvSqlite from '@keyv/sqlite';

import type { ConfigStoreAdapter, StoredConfigRecord } from '../types.ts';

export interface RedisKeyvStoreOptions {
  uri: string;
  namespace?: string;
}

export interface PostgresKeyvStoreOptions {
  uri: string;
  namespace?: string;
  table?: string;
  schema?: string;
  useUnloggedTable?: boolean;
}

export interface SqliteKeyvStoreOptions {
  uri: string;
  namespace?: string;
  table?: string;
}

export class KeyvStoreAdapter implements ConfigStoreAdapter {
  public constructor(private readonly keyv: Keyv<StoredConfigRecord>) {}

  public async get(key: string): Promise<StoredConfigRecord | undefined> {
    return (await this.keyv.get(key)) ?? undefined;
  }

  public async set(record: StoredConfigRecord): Promise<void> {
    await this.keyv.set(record.key, record);
  }

  public async delete(key: string): Promise<void> {
    await this.keyv.delete(key);
  }

  public async close(): Promise<void> {
    const disconnect = (
      this.keyv as {
        disconnect?: () => Promise<void>;
      }
    ).disconnect;

    if (disconnect !== undefined) {
      await disconnect.call(this.keyv);
    }
  }
}

export function createKeyvStore(
  keyv: Keyv<StoredConfigRecord>,
): ConfigStoreAdapter {
  return new KeyvStoreAdapter(keyv);
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
