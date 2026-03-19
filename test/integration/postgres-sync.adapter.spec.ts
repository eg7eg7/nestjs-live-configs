import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPostgresKeyvStore } from '../../src/live-config/adapters/keyv-store.adapter.ts';
import { createPostgresSyncAdapter } from '../../src/live-config/adapters/postgres-sync.adapter.ts';
import { defineConfig } from '../../src/live-config/live-config.registry.ts';
import { LiveConfigService } from '../../src/live-config/live-config.service.ts';

const postgresUrl = process.env.POSTGRES_URL;

const thresholdConfig = defineConfig<number>({
  key: 'demo.threshold',
  defaultValue: 10,
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

describe.runIf(postgresUrl !== undefined)(
  'Postgres live synchronization',
  () => {
    it('propagates updates between service instances with LISTEN/NOTIFY', async () => {
      const namespace = `postgres_test_${randomUUID()}`;
      const channel = `live_config_${randomUUID().replace(/-/g, '_')}`;

      const storeOne = createPostgresKeyvStore({
        uri: postgresUrl!,
        namespace,
        table: 'live_config_values',
      });
      const syncOne = createPostgresSyncAdapter({
        connectionString: postgresUrl!,
        channel,
      });

      const storeTwo = createPostgresKeyvStore({
        uri: postgresUrl!,
        namespace,
        table: 'live_config_values',
      });
      const syncTwo = createPostgresSyncAdapter({
        connectionString: postgresUrl!,
        channel,
      });

      const serviceOne = new LiveConfigService(storeOne, syncOne, {
        store: storeOne,
        sync: syncOne,
        defaults: {
          preferPubSub: true,
        },
      });
      const serviceTwo = new LiveConfigService(storeTwo, syncTwo, {
        store: storeTwo,
        sync: syncTwo,
        defaults: {
          preferPubSub: true,
        },
      });

      activeServices.push(serviceOne, serviceTwo);

      await serviceOne.onModuleInit();
      await serviceTwo.onModuleInit();

      await expect(serviceOne.set(thresholdConfig, 15)).resolves.toBe(15);
      await expect(serviceTwo.get(thresholdConfig)).resolves.toBe(15);

      await expect(serviceOne.set(thresholdConfig, 20)).resolves.toBe(20);

      await vi.waitFor(async () => {
        await expect(serviceTwo.get(thresholdConfig)).resolves.toBe(20);
      });
    });
  },
);
