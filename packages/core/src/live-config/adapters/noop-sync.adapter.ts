import type {
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigSyncAdapter,
} from '../types.ts';

export class NoopSyncAdapter implements ConfigSyncAdapter {
  public readonly strategy = 'noop' as const;

  public async start(_listener: ConfigChangeListener): Promise<void> {
    return;
  }

  public async publish(_event: ConfigChangeEvent): Promise<void> {
    return;
  }

  public async watchKey(_key: string, _intervalMs: number): Promise<void> {
    return;
  }

  public async unwatchKey(_key: string): Promise<void> {
    return;
  }
}
