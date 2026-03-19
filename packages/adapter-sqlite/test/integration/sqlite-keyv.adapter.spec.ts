import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  defineConfig,
  createStoredRecord,
  type ConfigStoreAdapter,
} from '@nestjs-live-configs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createSqliteKeyvStore } from '../../src/sqlite-keyv-store.adapter.ts';

const sqliteConfig = defineConfig<string>({
  key: 'sqlite.message',
  defaultValue: 'hello',
});

const stores: ConfigStoreAdapter[] = [];
const cleanupFiles = new Set<string>();

afterEach(async () => {
  for (const store of stores.splice(0)) {
    await store.close?.();
  }

  for (const filePath of cleanupFiles) {
    await rm(filePath, {
      force: true,
    });
  }

  cleanupFiles.clear();
});

describe('SQLite Keyv store adapter', () => {
  it('persists and deletes config records', async () => {
    const filePath = join(tmpdir(), `live-config-${randomUUID()}.sqlite`);
    cleanupFiles.add(filePath);

    const store = createSqliteKeyvStore({
      uri: `sqlite://${filePath}`,
      namespace: `test_${randomUUID()}`,
      table: 'live_config_values',
    });

    stores.push(store);

    const record = createStoredRecord(sqliteConfig, 'from-sqlite');
    await store.set(record);

    await expect(store.get(sqliteConfig.key)).resolves.toMatchObject({
      key: sqliteConfig.key,
      payload: 'from-sqlite',
      version: record.version,
    });

    await store.delete(sqliteConfig.key);
    await expect(store.get(sqliteConfig.key)).resolves.toBeUndefined();
  });
});
