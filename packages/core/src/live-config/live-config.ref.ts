import type { LiveConfigService } from './live-config.service.ts';
import type { LiveConfigDefinition, LiveConfigReadOptions } from './types.ts';

export class LiveConfigRef<T> {
  public constructor(
    private readonly service: LiveConfigService,
    private readonly definition: LiveConfigDefinition<T>,
    private readonly defaults?: LiveConfigReadOptions,
  ) {}

  public get(options?: LiveConfigReadOptions): Promise<T> {
    return this.service.get(this.definition, {
      ...this.defaults,
      ...options,
    });
  }

  public set(value: T): Promise<T> {
    return this.service.set(this.definition, value);
  }

  public close(): Promise<void> {
    return this.service.unwatch(this.definition);
  }
}
