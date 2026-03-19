import type { ModuleMetadata } from '@nestjs/common';

export type LiveConfigSyncStrategy = 'pubsub' | 'polling' | 'noop';

type LiveConfigInjectionToken =
  | string
  | symbol
  | (new (...args: never[]) => unknown)
  | (abstract new (...args: never[]) => unknown);

export interface LiveConfigDefinition<T> {
  key: string;
  defaultValue: T | (() => T);
  description?: string;
  serialize?: (value: T) => unknown;
  deserialize?: (payload: unknown) => T;
  validate?: (value: T) => void;
}

export interface LiveConfigDefaultOptions {
  forceRefreshOnRead?: boolean;
  watchIntervalMs?: number;
  staleTtlMs?: number;
  preferPubSub?: boolean;
}

export interface LiveConfigReadOptions {
  forceRefresh?: boolean;
  watchIntervalMs?: number;
  staleTtlMs?: number;
  preferPubSub?: boolean;
}

export interface ResolvedLiveConfigReadOptions {
  forceRefresh: boolean;
  watchIntervalMs?: number;
  staleTtlMs?: number;
  preferPubSub: boolean;
}

export interface StoredConfigRecord {
  key: string;
  payload: unknown;
  version: string;
  updatedAt: string;
}

export interface ConfigChangeEvent {
  key: string;
  version: string;
  updatedAt: string;
}

export interface ConfigStoreAdapter {
  get(key: string): Promise<StoredConfigRecord | undefined>;
  set(record: StoredConfigRecord): Promise<void>;
  delete(key: string): Promise<void>;
  close?(): Promise<void>;
}

export type ConfigChangeListener = (
  event: ConfigChangeEvent,
) => Promise<void> | void;

export interface ConfigSyncAdapter {
  readonly strategy: LiveConfigSyncStrategy;
  start(listener: ConfigChangeListener): Promise<void>;
  publish(event: ConfigChangeEvent): Promise<void>;
  watchKey?(key: string, intervalMs: number): Promise<void>;
  unwatchKey?(key: string): Promise<void>;
  close?(): Promise<void>;
}

export interface LiveConfigAdapter {
  store: ConfigStoreAdapter;
  sync?: ConfigSyncAdapter;
}

export interface LiveConfigModuleOptions {
  adapter?: LiveConfigAdapter;
  store?: ConfigStoreAdapter;
  sync?: ConfigSyncAdapter;
  defaults?: LiveConfigDefaultOptions;
}

export interface ResolvedLiveConfigModuleOptions {
  store: ConfigStoreAdapter;
  sync: ConfigSyncAdapter;
  defaults?: LiveConfigDefaultOptions;
}

export interface LiveConfigModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: LiveConfigInjectionToken[];
  useFactory: (
    ...args: unknown[]
  ) => Promise<LiveConfigModuleOptions> | LiveConfigModuleOptions;
}
