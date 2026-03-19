import { Body, Controller, Get, Put, Query } from '@nestjs/common';

import { AppService } from './app.service.ts';
import {
  LiveConfigReadQueryDto,
  UpdateLiveConfigValueDto,
  UpdateThemeValueDto,
} from './dto/live-config.dto.ts';
import { createDemoBackend } from './live-config-backend.ts';

const demoBackend = createDemoBackend(process.env);

@Controller()
export class AppController {
  public constructor(private readonly appService: AppService) {}

  @Get('health')
  public getHealth() {
    return {
      status: 'ok',
      driver: demoBackend.driver,
      mode: 'demo',
    };
  }

  @Get('consumer/greeting')
  public async getGreeting() {
    return {
      greeting: await this.appService.getGreeting(),
    };
  }

  @Get('settings/message')
  public async getMessage(@Query() query: LiveConfigReadQueryDto) {
    return {
      value: await this.appService.getMessage(query),
      options: query,
    };
  }

  @Put('settings/message')
  public async setMessage(@Body() body: UpdateLiveConfigValueDto) {
    return {
      value: await this.appService.setMessage(body.value),
    };
  }

  @Get('settings/theme')
  public async getTheme(@Query() query: LiveConfigReadQueryDto) {
    return {
      value: await this.appService.getTheme(query),
      options: query,
    };
  }

  @Put('settings/theme')
  public async setTheme(@Body() body: UpdateThemeValueDto) {
    return {
      value: await this.appService.setTheme(body.value),
    };
  }
}
