import type Keyv from 'keyv';

import type { ConfigStoreAdapter, StoredConfigRecord } from '../types.ts';

export class KeyvStoreAdapter implements ConfigStoreAdapter {
  private closePromise?: Promise<void>;

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
    if (this.closePromise !== undefined) {
      return this.closePromise;
    }

    const disconnect = (
      this.keyv as {
        disconnect?: () => Promise<void>;
      }
    ).disconnect;

    this.closePromise = (async () => {
      if (disconnect === undefined) {
        return;
      }

      try {
        await disconnect.call(this.keyv);
      } catch (error) {
        if (isRedundantDisconnectError(error)) {
          return;
        }

        throw error;
      }
    })();

    return this.closePromise;
  }
}

export function createKeyvStore(
  keyv: Keyv<StoredConfigRecord>,
): ConfigStoreAdapter {
  return new KeyvStoreAdapter(keyv);
}

function isRedundantDisconnectError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('Called end on pool more than once');
}
