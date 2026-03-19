import { describe, expect, it } from 'vitest';

import { NoopSyncAdapter } from '../../src/live-config/adapters/noop-sync.adapter.ts';
import { normalizeLiveConfigModuleOptions } from '../../src/live-config/live-config.module.ts';
import {
  ManualPubSubSyncAdapter,
  MemoryStoreAdapter,
} from '../helpers/test-doubles.ts';

describe('normalizeLiveConfigModuleOptions', () => {
  it('uses the unified adapter bundle when provided', () => {
    const store = new MemoryStoreAdapter();
    const sync = new ManualPubSubSyncAdapter();

    const options = normalizeLiveConfigModuleOptions({
      adapter: {
        store,
        sync,
      },
      defaults: {
        preferPubSub: true,
      },
    });

    expect(options.store).toBe(store);
    expect(options.sync).toBe(sync);
    expect(options.defaults?.preferPubSub).toBe(true);
  });

  it('falls back to a noop sync adapter when only a store is provided', () => {
    const store = new MemoryStoreAdapter();

    const options = normalizeLiveConfigModuleOptions({
      store,
    });

    expect(options.store).toBe(store);
    expect(options.sync).toBeInstanceOf(NoopSyncAdapter);
  });

  it('throws when neither store nor adapter is provided', () => {
    expect(() => normalizeLiveConfigModuleOptions({})).toThrow(
      'LiveConfigModule requires either an adapter or a store instance.',
    );
  });
});
