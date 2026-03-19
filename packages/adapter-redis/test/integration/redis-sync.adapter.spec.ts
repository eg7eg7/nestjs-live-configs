import { randomUUID } from 'node:crypto';

import { defineConfig, LiveConfigService } from '@nestjs-live-configs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRedisAdapter } from '../../src/redis.adapter.ts';

const redisUrl = process.env.REDIS_URL;

const colorConfig = defineConfig<string>({
  key: 'demo.color',
  defaultValue: 'blue',
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

describe.runIf(redisUrl !== undefined)('Redis live synchronization', () => {
  it('propagates updates between service instances over pub/sub', async () => {
    const namespace = `redis_test_${randomUUID()}`;
    const channel = `live-config-${randomUUID()}`;

    const adapterOne = createRedisAdapter({
      uri: redisUrl!,
      namespace,
      channel,
    });
    const adapterTwo = createRedisAdapter({
      uri: redisUrl!,
      namespace,
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

    await expect(serviceOne.set(colorConfig, 'green')).resolves.toBe('green');
    await expect(serviceTwo.get(colorConfig)).resolves.toBe('green');

    await expect(serviceOne.set(colorConfig, 'purple')).resolves.toBe('purple');

    await vi.waitFor(async () => {
      await expect(serviceTwo.get(colorConfig)).resolves.toBe('purple');
    });
  });
});
