import { Client } from 'pg';

import type {
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigSyncAdapter,
} from '@nestjs-live-configs/core';

export interface PostgresSyncAdapterOptions {
  connectionString: string;
  channel?: string;
}

export class PostgresSyncAdapter implements ConfigSyncAdapter {
  public readonly strategy = 'pubsub' as const;

  private readonly channel: string;
  private publisher?: Client;
  private subscriber?: Client;

  public constructor(private readonly options: PostgresSyncAdapterOptions) {
    this.channel = options.channel ?? 'live_config_changes';
  }

  public async start(listener: ConfigChangeListener): Promise<void> {
    if (this.subscriber !== undefined) {
      return;
    }

    this.subscriber = new Client({
      connectionString: this.options.connectionString,
    });

    await this.subscriber.connect();
    this.subscriber.on('notification', (message) => {
      if (message.payload === undefined) {
        return;
      }

      const event = JSON.parse(message.payload) as ConfigChangeEvent;
      void listener(event);
    });

    await this.subscriber.query(`LISTEN ${this.channel}`);
  }

  public async publish(event: ConfigChangeEvent): Promise<void> {
    if (this.publisher === undefined) {
      this.publisher = new Client({
        connectionString: this.options.connectionString,
      });

      await this.publisher.connect();
    }

    await this.publisher.query('select pg_notify($1, $2)', [
      this.channel,
      JSON.stringify(event),
    ]);
  }

  public async close(): Promise<void> {
    if (this.subscriber !== undefined) {
      await this.subscriber.query(`UNLISTEN ${this.channel}`);
      await this.subscriber.end();
      this.subscriber = undefined;
    }

    if (this.publisher !== undefined) {
      await this.publisher.end();
      this.publisher = undefined;
    }
  }
}

export function createPostgresSyncAdapter(
  options: PostgresSyncAdapterOptions,
): ConfigSyncAdapter {
  return new PostgresSyncAdapter(options);
}
