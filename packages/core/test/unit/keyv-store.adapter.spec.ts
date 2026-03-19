import type Keyv from 'keyv';
import { describe, expect, it, vi } from 'vitest';

import { KeyvStoreAdapter } from '../../src/live-config/adapters/keyv-store.adapter.ts';
import type { StoredConfigRecord } from '../../src/live-config/types.ts';

describe('KeyvStoreAdapter.close', () => {
  it('ignores redundant disconnect errors from shared pools', async () => {
    const disconnect = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('Called end on pool more than once'));

    const adapter = new KeyvStoreAdapter({
      disconnect,
    } as unknown as Keyv<StoredConfigRecord>);

    await expect(adapter.close()).resolves.toBeUndefined();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('is idempotent for repeated close calls', async () => {
    const disconnect = vi.fn<() => Promise<void>>().mockResolvedValue();

    const adapter = new KeyvStoreAdapter({
      disconnect,
    } as unknown as Keyv<StoredConfigRecord>);

    await adapter.close();
    await adapter.close();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
