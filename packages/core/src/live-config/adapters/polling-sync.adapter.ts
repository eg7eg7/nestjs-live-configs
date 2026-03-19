import type {
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigStoreAdapter,
  ConfigSyncAdapter,
} from '../types.ts';
import { clampWatchIntervalMs } from '../live-config.guards.ts';

export interface PollingSyncAdapterOptions {
  store: ConfigStoreAdapter;
}

export class PollingSyncAdapter implements ConfigSyncAdapter {
  public readonly strategy = 'polling' as const;

  private listener?: ConfigChangeListener;
  private readonly intervals = new Map<string, number>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly lastVersions = new Map<string, string | undefined>();

  public constructor(private readonly options: PollingSyncAdapterOptions) {}

  public async start(listener: ConfigChangeListener): Promise<void> {
    this.listener = listener;
  }

  public async publish(_event: ConfigChangeEvent): Promise<void> {
    return;
  }

  public async watchKey(key: string, intervalMs: number): Promise<void> {
    const nextInterval = clampWatchIntervalMs(intervalMs);
    const currentInterval = this.intervals.get(key);

    if (currentInterval !== undefined && currentInterval <= nextInterval) {
      return;
    }

    const currentTimer = this.timers.get(key);
    if (currentTimer !== undefined) {
      clearInterval(currentTimer);
    }

    this.intervals.set(key, nextInterval);

    const initialRecord = await this.options.store.get(key);
    this.lastVersions.set(key, initialRecord?.version);

    const timer = setInterval(() => {
      void this.pollKey(key);
    }, nextInterval);

    this.timers.set(key, timer);
  }

  public async unwatchKey(key: string): Promise<void> {
    const timer = this.timers.get(key);
    if (timer !== undefined) {
      clearInterval(timer);
    }

    this.timers.delete(key);
    this.intervals.delete(key);
    this.lastVersions.delete(key);
  }

  public async close(): Promise<void> {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }

    this.timers.clear();
    this.intervals.clear();
    this.lastVersions.clear();
  }

  private async pollKey(key: string): Promise<void> {
    if (this.listener === undefined) {
      return;
    }

    const record = await this.options.store.get(key);
    const previousVersion = this.lastVersions.get(key);
    const nextVersion = record?.version;

    if (previousVersion === nextVersion) {
      return;
    }

    this.lastVersions.set(key, nextVersion);

    await this.listener({
      key,
      version: nextVersion ?? `deleted:${Date.now()}`,
      updatedAt: record?.updatedAt ?? new Date().toISOString(),
    });
  }
}

export function createPollingSyncAdapter(
  options: PollingSyncAdapterOptions,
): ConfigSyncAdapter {
  return new PollingSyncAdapter(options);
}
