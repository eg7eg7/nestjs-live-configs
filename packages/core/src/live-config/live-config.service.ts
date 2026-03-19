import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import { LiveConfigRef } from './live-config.ref.ts';
import { compareStoredConfigRecords } from './live-config.guards.ts';
import {
  createStoredRecord,
  deserializeValue,
  mergeReadOptions,
  resolveDefaultValue,
  validateValue,
} from './live-config.registry.ts';
import {
  LIVE_CONFIG_OPTIONS,
  LIVE_CONFIG_STORE,
  LIVE_CONFIG_SYNC,
} from './tokens.ts';
import type {
  ConfigChangeEvent,
  ConfigStoreAdapter,
  ConfigSyncAdapter,
  LiveConfigDefinition,
  LiveConfigReadOptions,
  ResolvedLiveConfigModuleOptions,
  ResolvedLiveConfigReadOptions,
  StoredConfigRecord,
} from './types.ts';

interface CacheEntry {
  fetchedAt: number;
  record: StoredConfigRecord;
}

@Injectable()
export class LiveConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveConfigService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlightRefreshes = new Map<
    string,
    Promise<StoredConfigRecord | undefined>
  >();
  private readonly watchedKeys = new Set<string>();
  private readonly definitions = new Map<
    string,
    LiveConfigDefinition<unknown>
  >();

  public constructor(
    @Inject(LIVE_CONFIG_STORE)
    private readonly store: ConfigStoreAdapter,
    @Inject(LIVE_CONFIG_SYNC)
    private readonly sync: ConfigSyncAdapter,
    @Inject(LIVE_CONFIG_OPTIONS)
    private readonly moduleOptions: ResolvedLiveConfigModuleOptions,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.sync.start(async (event) => {
      try {
        await this.handleChangeEvent(event);
      } catch (error) {
        this.logger.error(
          `Failed to handle config change for "${event.key}".`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    });
  }

  public async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(
      [...this.watchedKeys].map(async (key) => {
        await this.sync.unwatchKey?.(key);
      }),
    );
    this.watchedKeys.clear();

    try {
      await this.sync.close?.();
    } finally {
      await this.store.close?.();
    }
  }

  public ref<T>(
    definition: LiveConfigDefinition<T>,
    defaults?: LiveConfigReadOptions,
  ): LiveConfigRef<T> {
    this.rememberDefinition(definition);
    return new LiveConfigRef(this, definition, defaults);
  }

  public async get<T>(
    definition: LiveConfigDefinition<T>,
    overrides?: LiveConfigReadOptions,
  ): Promise<T> {
    this.rememberDefinition(definition);

    const resolvedOptions = mergeReadOptions(
      this.moduleOptions.defaults,
      overrides,
    );

    await this.maybeWatchKey(definition.key, resolvedOptions);

    if (!this.mustRefreshFromStore(definition.key, resolvedOptions)) {
      const cachedRecord = this.cache.get(definition.key)?.record;
      if (cachedRecord !== undefined) {
        return deserializeValue(definition, cachedRecord.payload);
      }
    }

    return this.readFromStoreOrDefault(definition);
  }

  public async set<T>(
    definition: LiveConfigDefinition<T>,
    value: T,
  ): Promise<T> {
    this.rememberDefinition(definition);
    validateValue(definition, value);

    const record = createStoredRecord(definition, value);
    await this.store.set(record);

    this.cache.set(definition.key, {
      fetchedAt: Date.now(),
      record,
    });

    await this.sync.publish({
      key: record.key,
      version: record.version,
      updatedAt: record.updatedAt,
    });

    return value;
  }

  public async delete(key: string): Promise<void> {
    await this.store.delete(key);
    this.cache.delete(key);

    await this.sync.publish({
      key,
      version: `deleted:${Date.now()}`,
      updatedAt: new Date().toISOString(),
    });
  }

  public async unwatch<T>(definitionOrKey: LiveConfigDefinition<T> | string) {
    const key =
      typeof definitionOrKey === 'string'
        ? definitionOrKey
        : definitionOrKey.key;

    this.watchedKeys.delete(key);
    await this.sync.unwatchKey?.(key);
  }

  private async readFromStoreOrDefault<T>(
    definition: LiveConfigDefinition<T>,
  ): Promise<T> {
    const record = await this.refreshFromStore(definition.key);
    if (record !== undefined) {
      return deserializeValue(definition, record.payload);
    }

    const defaultValue = resolveDefaultValue(definition);
    validateValue(definition, defaultValue);
    return defaultValue;
  }

  private mustRefreshFromStore(
    key: string,
    options: ResolvedLiveConfigReadOptions,
  ): boolean {
    if (options.forceRefresh) {
      return true;
    }

    const cachedEntry = this.cache.get(key);
    if (cachedEntry === undefined) {
      return true;
    }

    if (options.staleTtlMs !== undefined) {
      return Date.now() - cachedEntry.fetchedAt > options.staleTtlMs;
    }

    if (options.preferPubSub && this.sync.strategy === 'pubsub') {
      return false;
    }

    if (
      options.watchIntervalMs !== undefined &&
      this.sync.strategy === 'polling'
    ) {
      return false;
    }

    return true;
  }

  private async maybeWatchKey(
    key: string,
    options: ResolvedLiveConfigReadOptions,
  ): Promise<void> {
    if (options.watchIntervalMs === undefined) {
      return;
    }

    if (options.preferPubSub && this.sync.strategy === 'pubsub') {
      return;
    }

    await this.sync.watchKey?.(key, options.watchIntervalMs);
    this.watchedKeys.add(key);
  }

  private async handleChangeEvent(event: ConfigChangeEvent): Promise<void> {
    if (!this.definitions.has(event.key)) {
      return;
    }

    const cachedVersion = this.cache.get(event.key)?.record.version;
    if (cachedVersion === event.version) {
      return;
    }

    await this.refreshFromStore(event.key);
  }

  private async refreshFromStore(
    key: string,
  ): Promise<StoredConfigRecord | undefined> {
    const existingRefresh = this.inFlightRefreshes.get(key);
    if (existingRefresh !== undefined) {
      return existingRefresh;
    }

    const refreshPromise = this.fetchAndCacheRecord(key).finally(() => {
      this.inFlightRefreshes.delete(key);
    });

    this.inFlightRefreshes.set(key, refreshPromise);
    return refreshPromise;
  }

  private async fetchAndCacheRecord(
    key: string,
  ): Promise<StoredConfigRecord | undefined> {
    const cachedRecordBeforeFetch = this.cache.get(key)?.record;
    const record = await this.store.get(key);

    const currentCachedRecord = this.cache.get(key)?.record;
    if (record === undefined) {
      if (
        currentCachedRecord === undefined ||
        currentCachedRecord.version === cachedRecordBeforeFetch?.version
      ) {
        this.cache.delete(key);
        return undefined;
      }

      return currentCachedRecord;
    }

    if (
      currentCachedRecord !== undefined &&
      currentCachedRecord.version !== cachedRecordBeforeFetch?.version &&
      compareStoredConfigRecords(currentCachedRecord, record) > 0
    ) {
      return currentCachedRecord;
    }

    this.cache.set(key, {
      fetchedAt: Date.now(),
      record,
    });

    return record;
  }

  private rememberDefinition<T>(definition: LiveConfigDefinition<T>): void {
    if (!this.definitions.has(definition.key)) {
      this.definitions.set(
        definition.key,
        definition as LiveConfigDefinition<unknown>,
      );
    }
  }
}
