import { Body, Controller, Get, Put, Query } from '@nestjs/common';

import type { LiveConfigReadOptions } from '@nestjs-live-configs/core';
import { AppService } from './app.service.ts';
import { describeDemoBackend } from './live-config-backend.ts';

@Controller()
export class AppController {
  public constructor(private readonly appService: AppService) {}

  @Get('health')
  public getHealth() {
    const backend = describeDemoBackend(process.env);

    return {
      driver: backend.driver,
      defaults: backend.defaults,
      hint: 'Use PUT /settings/message or PUT /settings/theme to update values.',
    };
  }

  @Get('consumer/greeting')
  public async getGreeting() {
    return {
      greeting: await this.appService.getGreeting(),
    };
  }

  @Get('settings/message')
  public async getMessage(@Query() query: Record<string, string | undefined>) {
    const options = parseReadOptions(query);

    return {
      value: await this.appService.getMessage(options),
      options,
    };
  }

  @Put('settings/message')
  public async setMessage(@Body() body: { value: string }) {
    return {
      value: await this.appService.setMessage(body.value),
    };
  }

  @Get('settings/theme')
  public async getTheme(@Query() query: Record<string, string | undefined>) {
    const options = parseReadOptions(query);

    return {
      value: await this.appService.getTheme(options),
      options,
    };
  }

  @Put('settings/theme')
  public async setTheme(@Body() body: { value: string }) {
    return {
      value: await this.appService.setTheme(body.value),
    };
  }
}

function parseReadOptions(
  query: Record<string, string | undefined>,
): LiveConfigReadOptions {
  return {
    forceRefresh: parseBoolean(query.forceRefresh),
    preferPubSub: parseBoolean(query.preferPubSub),
    staleTtlMs: parseNumber(query.staleTtlMs),
    watchIntervalMs: parseNumber(query.watchIntervalMs),
  };
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === 'true';
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
