import { afterEach, describe, expect, it } from 'vitest';

import { NoopSyncAdapter } from '../../src/live-config/adapters/noop-sync.adapter.ts';
import {
  createStoredRecord,
  defineConfig,
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

  it('ignores pub/sub events for unknown keys', async () => {
    const store = new MemoryStoreAdapter();
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

    await sync.emit({
      key: 'unknown.key',
      version: '1',
      updatedAt: new Date().toISOString(),
    });

    expect(store.getCalls).toBe(0);
  });

  it('does not let an older refresh overwrite a newer cached value', async () => {
    const staleRecord = {
      key: appNameConfig.key,
      payload: 'stale',
      version: '100-stale',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    const store = new RacyStoreAdapter(staleRecord);
    const sync = new NoopSyncAdapter();

    const service = new LiveConfigService(store, sync, {
      store,
      sync,
    });
    store.attachService(service);

    activeServices.push(service);
    await service.onModuleInit();

    await expect(
      service.get(appNameConfig, {
        forceRefresh: true,
      }),
    ).resolves.toBe('fresh');
    await expect(service.get(appNameConfig)).resolves.toBe('fresh');
  });
});

class RacyStoreAdapter extends MemoryStoreAdapter {
  private service?: LiveConfigService;
  private hasInjectedFreshWrite = false;

  public constructor(
    private readonly staleRecord: {
      key: string;
      payload: unknown;
      version: string;
      updatedAt: string;
    },
  ) {
    super();
  }

  public attachService(service: LiveConfigService): void {
    this.service = service;
  }

  public override async get(key: string) {
    this.getCalls += 1;

    if (!this.hasInjectedFreshWrite) {
      this.hasInjectedFreshWrite = true;
      await this.service?.set(appNameConfig, 'fresh');
      return structuredClone(this.staleRecord);
    }

    return super.get(key);
  }
}
