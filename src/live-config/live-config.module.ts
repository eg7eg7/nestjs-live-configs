import { Module, type DynamicModule, type Provider } from '@nestjs/common';

import { NoopSyncAdapter } from './adapters/noop-sync.adapter.ts';
import { LiveConfigService } from './live-config.service.ts';
import {
  LIVE_CONFIG_OPTIONS,
  LIVE_CONFIG_STORE,
  LIVE_CONFIG_SYNC,
} from './tokens.ts';
import type {
  LiveConfigModuleAsyncOptions,
  LiveConfigModuleOptions,
} from './types.ts';

@Module({})
export class LiveConfigModule {
  public static forRoot(options: LiveConfigModuleOptions): DynamicModule {
    return {
      module: LiveConfigModule,
      providers: createProviders({
        provide: LIVE_CONFIG_OPTIONS,
        useValue: options,
      }),
      exports: [LiveConfigService, LIVE_CONFIG_STORE, LIVE_CONFIG_SYNC],
    };
  }

  public static forRootAsync(
    options: LiveConfigModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: LiveConfigModule,
      imports: options.imports,
      providers: createProviders({
        provide: LIVE_CONFIG_OPTIONS,
        useFactory: options.useFactory,
        inject: [...(options.inject ?? [])],
      }),
      exports: [LiveConfigService, LIVE_CONFIG_STORE, LIVE_CONFIG_SYNC],
    };
  }
}

function createProviders(optionsProvider: Provider): Provider[] {
  return [
    optionsProvider,
    {
      provide: LIVE_CONFIG_STORE,
      useFactory: (options: LiveConfigModuleOptions) => options.store,
      inject: [LIVE_CONFIG_OPTIONS],
    },
    {
      provide: LIVE_CONFIG_SYNC,
      useFactory: (options: LiveConfigModuleOptions) =>
        options.sync ?? new NoopSyncAdapter(),
      inject: [LIVE_CONFIG_OPTIONS],
    },
    LiveConfigService,
  ];
}
