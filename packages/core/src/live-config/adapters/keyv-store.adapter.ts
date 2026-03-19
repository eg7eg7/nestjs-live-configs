import type Keyv from 'keyv';

import type { ConfigStoreAdapter, StoredConfigRecord } from '../types.ts';

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
