import { afterEach, describe, expect, it } from 'vitest';

import { NoopSyncAdapter } from '../../src/live-config/adapters/noop-sync.adapter.ts';
import {
  defineConfig,
  createStoredRecord,
} from '../../src/live-config/live-config.registry.ts';
import { LiveConfigService } from '../../src/live-config/live-config.service.ts';
import {
  ManualPubSubSyncAdapter,
  MemoryStoreAdapter,
} from '../helpers/test-doubles.ts';

const appNameConfig = defineConfig<string>({
  key: 'app.name',
  defaultValue: 'default-name',
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

describe('LiveConfigService', () => {
  it('refreshes from the store on each read when no live sync is configured', async () => {
    const initialRecord = createStoredRecord(appNameConfig, 'alpha');
    const store = new MemoryStoreAdapter([initialRecord]);
    const sync = new NoopSyncAdapter();

    const service = new LiveConfigService(store, sync, {
      store,
      sync,
    });

    activeServices.push(service);
    await service.onModuleInit();

    await expect(service.get(appNameConfig)).resolves.toBe('alpha');

    await store.set(createStoredRecord(appNameConfig, 'beta'));

    await expect(service.get(appNameConfig)).resolves.toBe('beta');
    expect(store.getCalls).toBeGreaterThanOrEqual(2);
  });

  it('updates the in-memory cache when a pub/sub change event arrives', async () => {
    const initialRecord = createStoredRecord(appNameConfig, 'alpha');
    const store = new MemoryStoreAdapter([initialRecord]);
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

    await expect(service.get(appNameConfig)).resolves.toBe('alpha');

    const nextRecord = createStoredRecord(appNameConfig, 'beta');
    await store.set(nextRecord);
    await sync.emit({
      key: nextRecord.key,
      version: nextRecord.version,
      updatedAt: nextRecord.updatedAt,
    });

    await expect(service.get(appNameConfig)).resolves.toBe('beta');
  });

  it('publishes a change event after persisting a new value', async () => {
    const store = new MemoryStoreAdapter();
    const sync = new ManualPubSubSyncAdapter();

    const service = new LiveConfigService(store, sync, {
      store,
      sync,
    });

    activeServices.push(service);
    await service.onModuleInit();

    await expect(service.set(appNameConfig, 'gamma')).resolves.toBe('gamma');

    const persistedRecord = await store.get(appNameConfig.key);
    expect(persistedRecord?.payload).toBe('gamma');
    expect(sync.publishedEvents).toHaveLength(1);
    expect(sync.publishedEvents[0]?.key).toBe(appNameConfig.key);
  });
});
