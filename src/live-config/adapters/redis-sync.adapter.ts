import { createClient, type RedisClientType } from 'redis';

import type {
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigSyncAdapter,
} from '../types.ts';

export interface RedisSyncAdapterOptions {
  uri: string;
  channel?: string;
}

export class RedisSyncAdapter implements ConfigSyncAdapter {
  public readonly strategy = 'pubsub' as const;

  private readonly channel: string;
  private publisher?: RedisClientType;
  private subscriber?: RedisClientType;

  public constructor(private readonly options: RedisSyncAdapterOptions) {
    this.channel = options.channel ?? 'live-config:changes';
  }

  public async start(listener: ConfigChangeListener): Promise<void> {
    if (this.subscriber !== undefined) {
      return;
    }

    this.subscriber = createClient({
      url: this.options.uri,
    });

    await this.subscriber.connect();
    await this.subscriber.subscribe(this.channel, (message) => {
      const event = JSON.parse(message) as ConfigChangeEvent;
      void listener(event);
    });
  }

  public async publish(event: ConfigChangeEvent): Promise<void> {
    if (this.publisher === undefined) {
      this.publisher = createClient({
        url: this.options.uri,
      });

      await this.publisher.connect();
    }

    await this.publisher.publish(this.channel, JSON.stringify(event));
  }

  public async close(): Promise<void> {
    if (this.subscriber !== undefined) {
      await this.subscriber.unsubscribe(this.channel);
      await this.subscriber.quit();
      this.subscriber = undefined;
    }

    if (this.publisher !== undefined) {
      await this.publisher.quit();
      this.publisher = undefined;
    }
  }
}

export function createRedisSyncAdapter(
  options: RedisSyncAdapterOptions,
): ConfigSyncAdapter {
  return new RedisSyncAdapter(options);
}
