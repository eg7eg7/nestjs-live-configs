import { randomUUID } from 'node:crypto';

import { defineConfig, LiveConfigService } from '@nestjs-live-configs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPostgresAdapter } from '../../src/postgres.adapter.ts';

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

      const adapterOne = createPostgresAdapter({
        uri: postgresUrl!,
        namespace,
        table: 'live_config_values',
        channel,
      });
      const adapterTwo = createPostgresAdapter({
        uri: postgresUrl!,
        namespace,
        table: 'live_config_values',
        channel,
      });

      const serviceOne = new LiveConfigService(
        adapterOne.store,
        adapterOne.sync!,
        {
          store: adapterOne.store,
          sync: adapterOne.sync!,
          defaults: {
            preferPubSub: true,
          },
        },
      );
      const serviceTwo = new LiveConfigService(
        adapterTwo.store,
        adapterTwo.sync!,
        {
          store: adapterTwo.store,
          sync: adapterTwo.sync!,
          defaults: {
            preferPubSub: true,
          },
        },
      );

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
