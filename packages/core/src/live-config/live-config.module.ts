import { Module, type DynamicModule, type Provider } from '@nestjs/common';

import { NoopSyncAdapter } from './adapters/noop-sync.adapter.ts';
import { LiveConfigService } from './live-config.service.ts';
import {
  LIVE_CONFIG_OPTIONS,
  LIVE_CONFIG_STORE,
  LIVE_CONFIG_SYNC,
} from './tokens.ts';
import type {
  LiveConfigAdapter,
  LiveConfigModuleAsyncOptions,
  LiveConfigModuleOptions,
  ResolvedLiveConfigModuleOptions,
} from './types.ts';

@Module({})
export class LiveConfigModule {
  public static forRoot(options: LiveConfigModuleOptions): DynamicModule {
    return {
      module: LiveConfigModule,
      providers: createProviders({
        provide: LIVE_CONFIG_OPTIONS,
        useValue: normalizeLiveConfigModuleOptions(options),
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
        useFactory: async (...args: unknown[]) =>
          normalizeLiveConfigModuleOptions(await options.useFactory(...args)),
        inject: [...(options.inject ?? [])],
      }),
      exports: [LiveConfigService, LIVE_CONFIG_STORE, LIVE_CONFIG_SYNC],
    };
  }
}

export function normalizeLiveConfigModuleOptions(
  options: LiveConfigModuleOptions,
): ResolvedLiveConfigModuleOptions {
  const adapter = options.adapter;
  const store = adapter?.store ?? options.store;

  if (store === undefined) {
    throw new Error(
      'LiveConfigModule requires either an adapter or a store instance.',
    );
  }

  return {
    store,
    sync: resolveSyncAdapter(adapter, options),
    defaults: options.defaults,
  };
}

function createProviders(optionsProvider: Provider): Provider[] {
  return [
    optionsProvider,
    {
      provide: LIVE_CONFIG_STORE,
      useFactory: (options: ResolvedLiveConfigModuleOptions) => options.store,
      inject: [LIVE_CONFIG_OPTIONS],
    },
    {
      provide: LIVE_CONFIG_SYNC,
      useFactory: (options: ResolvedLiveConfigModuleOptions) => options.sync,
      inject: [LIVE_CONFIG_OPTIONS],
    },
    LiveConfigService,
  ];
}

function resolveSyncAdapter(
  adapter: LiveConfigAdapter | undefined,
  options: LiveConfigModuleOptions,
) {
  return adapter?.sync ?? options.sync ?? new NoopSyncAdapter();
}
