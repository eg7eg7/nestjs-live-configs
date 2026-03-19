import { Injectable } from '@nestjs/common';

import {
  LiveConfigService,
  type LiveConfigReadOptions,
} from '@nestjs-live-configs/core';
import { demoMessageConfig, demoThemeConfig } from './demo.config.ts';

@Injectable()
export class AppService {
  public constructor(private readonly liveConfig: LiveConfigService) {}

  public async getGreeting(): Promise<string> {
    const message = await this.liveConfig
      .ref(demoMessageConfig, {
        preferPubSub: true,
      })
      .get();
    const theme = await this.liveConfig.ref(demoThemeConfig).get();

    return `[theme=${theme}] ${message}`;
  }

  public async getMessage(options?: LiveConfigReadOptions): Promise<string> {
    return this.liveConfig.get(demoMessageConfig, options);
  }

  public async setMessage(value: string): Promise<string> {
    return this.liveConfig.set(demoMessageConfig, value);
  }

  public async getTheme(options?: LiveConfigReadOptions): Promise<string> {
    return this.liveConfig.get(demoThemeConfig, options);
  }

  public async setTheme(value: string): Promise<string> {
    return this.liveConfig.set(demoThemeConfig, value);
  }
}
