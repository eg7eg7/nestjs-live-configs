import { randomUUID } from 'node:crypto';

import {
  createStoredRecord,
  defineConfig,
  type ConfigStoreAdapter,
} from '@nestjs-live-configs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createMongoKeyvStore } from '../../src/mongo-keyv-store.adapter.ts';

const mongoUrl = process.env.MONGODB_URL;

const mongoConfig = defineConfig<string>({
  key: 'mongo.message',
  defaultValue: 'hello',
});

const stores: ConfigStoreAdapter[] = [];

afterEach(async () => {
  for (const store of stores.splice(0)) {
    await store.close?.();
  }
});

describe.runIf(mongoUrl !== undefined)('Mongo Keyv store adapter', () => {
  it('persists and deletes config records', async () => {
    const store = createMongoKeyvStore({
      uri: mongoUrl!,
      namespace: `test_${randomUUID()}`,
      collection: 'live_config_values',
    });

    stores.push(store);

    const record = createStoredRecord(mongoConfig, 'from-mongo');
    await store.set(record);

    await expect(store.get(mongoConfig.key)).resolves.toMatchObject({
      key: mongoConfig.key,
      payload: 'from-mongo',
      version: record.version,
    });

    await store.delete(mongoConfig.key);
    await expect(store.get(mongoConfig.key)).resolves.toBeUndefined();
  });
});
