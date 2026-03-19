import { afterEach, describe, expect, it, vi } from 'vitest';

import { PollingSyncAdapter } from '../../src/live-config/adapters/polling-sync.adapter.ts';
import {
  createStoredRecord,
  defineConfig,
  mergeReadOptions,
} from '../../src/live-config/live-config.registry.ts';
import { LiveConfigService } from '../../src/live-config/live-config.service.ts';
import type {
  ConfigChangeEvent,
  ConfigChangeListener,
} from '../../src/live-config/types.ts';
import {
  ManualPubSubSyncAdapter,
  MemoryStoreAdapter,
} from '../helpers/test-doubles.ts';

const sampleRateConfig = defineConfig<number>({
  key: 'sample.rate',
  defaultValue: 1,
  validate: (value) => {
    if (value < 1) {
      throw new Error('sample.rate must be positive');
    }
  },
});

const activeServices: LiveConfigService[] = [];

afterEach(async () => {
  while (activeServices.length > 0) {
    const service = activeServices.pop();
    if (service !== undefined) {
      await service.onModuleDestroy();
    }
  }
});

describe('LiveConfigService read options', () => {
  it('lets a per-call force refresh override a pub/sub-backed cached read', async () => {
    const store = new MemoryStoreAdapter([
      createStoredRecord(sampleRateConfig, 1),
    ]);
    const sync = new ManualPubSubSyncAdapter();

    const service = new LiveConfigService(store, sync, {
      store,
      sync,
      defaults: {
        preferPubSub: true,
      },
    });

    activeServices.push(service);
    await service.onModuleInit();

    await expect(service.get(sampleRateConfig)).resolves.toBe(1);

    await store.set(createStoredRecord(sampleRateConfig, 2));

    await expect(service.get(sampleRateConfig)).resolves.toBe(1);
    await expect(
      service.get(sampleRateConfig, {
        forceRefresh: true,
      }),
    ).resolves.toBe(2);
  });

  it('uses module defaults, while still allowing per-call overrides to disable them', async () => {
    const store = new MemoryStoreAdapter([
      createStoredRecord(sampleRateConfig, 2),
    ]);
    const sync = new ManualPubSubSyncAdapter();

    const service = new LiveConfigService(store, sync, {
      store,
      sync,
      defaults: {
        forceRefreshOnRead: true,
        preferPubSub: true,
      },
    });

    activeServices.push(service);
    await service.onModuleInit();

    await expect(service.get(sampleRateConfig)).resolves.toBe(2);

    await store.set(createStoredRecord(sampleRateConfig, 3));

    await expect(service.get(sampleRateConfig)).resolves.toBe(3);
    await expect(
      service.get(sampleRateConfig, {
        forceRefresh: false,
      }),
    ).resolves.toBe(3);

    await store.set(createStoredRecord(sampleRateConfig, 4));

    await expect(
      service.get(sampleRateConfig, {
        forceRefresh: false,
      }),
    ).resolves.toBe(3);
  });

  it('supports polling for a single config ref when an interval is requested', async () => {
    const store = new MemoryStoreAdapter([
      createStoredRecord(sampleRateConfig, 2),
    ]);
    const sync = new PollingSyncAdapter({
      store,
    });

    const service = new LiveConfigService(store, sync, {
      store,
      sync,
    });

    activeServices.push(service);
    await service.onModuleInit();

    const ref = service.ref(sampleRateConfig, {
      preferPubSub: false,
      watchIntervalMs: 25,
    });

    await expect(ref.get()).resolves.toBe(2);

    await store.set(createStoredRecord(sampleRateConfig, 5));

    await vi.waitFor(async () => {
      await expect(ref.get()).resolves.toBe(5);
    });
  });

  it('clamps unsafe read option values to safe bounds', () => {
    expect(
      mergeReadOptions(
        {
          staleTtlMs: -5,
          watchIntervalMs: 1,
        },
        {
          staleTtlMs: 999_999_999,
          watchIntervalMs: 5,
        },
      ),
    ).toEqual({
      forceRefresh: false,
      preferPubSub: true,
      staleTtlMs: 86_400_000,
      watchIntervalMs: 100,
    });
  });

  it('can explicitly unwatch polling keys through a ref', async () => {
    const store = new MemoryStoreAdapter([
      createStoredRecord(sampleRateConfig, 2),
    ]);
    const sync = new WatchableSyncAdapter();

    const service = new LiveConfigService(store, sync, {
      store,
      sync,
    });

    activeServices.push(service);
    await service.onModuleInit();

    const ref = service.ref(sampleRateConfig, {
      preferPubSub: false,
      watchIntervalMs: 250,
    });

    await expect(ref.get()).resolves.toBe(2);
    await ref.close();

    expect(sync.watchCalls).toEqual([
      {
        key: sampleRateConfig.key,
        intervalMs: 250,
      },
    ]);
    expect(sync.unwatchCalls).toEqual([sampleRateConfig.key]);
  });
});

class WatchableSyncAdapter {
  public readonly strategy = 'polling' as const;
  public readonly watchCalls: Array<{ key: string; intervalMs: number }> = [];
  public readonly unwatchCalls: string[] = [];

  public async start(_listener: ConfigChangeListener): Promise<void> {}

  public async publish(_event: ConfigChangeEvent): Promise<void> {}

  public async watchKey(key: string, intervalMs: number): Promise<void> {
    this.watchCalls.push({
      key,
      intervalMs,
    });
  }

  public async unwatchKey(key: string): Promise<void> {
    this.unwatchCalls.push(key);
  }
}
