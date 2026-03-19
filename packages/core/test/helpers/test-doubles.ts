import type {
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigStoreAdapter,
  ConfigSyncAdapter,
  StoredConfigRecord,
} from '../../src/live-config/types.ts';

export class MemoryStoreAdapter implements ConfigStoreAdapter {
  public readonly records = new Map<string, StoredConfigRecord>();
  public getCalls = 0;

  public constructor(seed: StoredConfigRecord[] = []) {
    for (const record of seed) {
      this.records.set(record.key, structuredClone(record));
    }
  }

  public async get(key: string): Promise<StoredConfigRecord | undefined> {
    this.getCalls += 1;
    const record = this.records.get(key);
    return record === undefined ? undefined : structuredClone(record);
  }

  public async set(record: StoredConfigRecord): Promise<void> {
    this.records.set(record.key, structuredClone(record));
  }

  public async delete(key: string): Promise<void> {
    this.records.delete(key);
  }
}

export class ManualPubSubSyncAdapter implements ConfigSyncAdapter {
  public readonly strategy = 'pubsub' as const;
  public readonly publishedEvents: ConfigChangeEvent[] = [];

  private listener?: ConfigChangeListener;

  public async start(listener: ConfigChangeListener): Promise<void> {
    this.listener = listener;
  }

  public async publish(event: ConfigChangeEvent): Promise<void> {
    this.publishedEvents.push(structuredClone(event));
  }

  public async emit(event: ConfigChangeEvent): Promise<void> {
    await this.listener?.(event);
  }
}
