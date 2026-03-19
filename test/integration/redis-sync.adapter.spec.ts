import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRedisKeyvStore } from '../../src/live-config/adapters/keyv-store.adapter.ts';
import { createRedisSyncAdapter } from '../../src/live-config/adapters/redis-sync.adapter.ts';
import { defineConfig } from '../../src/live-config/live-config.registry.ts';
import { LiveConfigService } from '../../src/live-config/live-config.service.ts';

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

    const storeOne = createRedisKeyvStore({
      uri: redisUrl!,
      namespace,
    });
    const syncOne = createRedisSyncAdapter({
      uri: redisUrl!,
      channel,
    });

    const storeTwo = createRedisKeyvStore({
      uri: redisUrl!,
      namespace,
    });
    const syncTwo = createRedisSyncAdapter({
      uri: redisUrl!,
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

    await expect(serviceOne.set(colorConfig, 'green')).resolves.toBe('green');
    await expect(serviceTwo.get(colorConfig)).resolves.toBe('green');

    await expect(serviceOne.set(colorConfig, 'purple')).resolves.toBe('purple');

    await vi.waitFor(async () => {
      await expect(serviceTwo.get(colorConfig)).resolves.toBe('purple');
    });
  });
});
