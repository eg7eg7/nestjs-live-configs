import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service.js';
import {
  LiveConfigReadQueryDto,
  UpdateLiveConfigValueDto,
  UpdateThemeValueDto,
} from './dto/live-config.dto.js';
import { createDemoBackend } from './live-config-backend.js';

const demoBackend = createDemoBackend(process.env);

@ApiTags('demo')
@Controller()
export class AppController {
  public constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Report demo app health and selected backend' })
  @ApiOkResponse({ description: 'Health status for the demo app.' })
  @Get('health')
  public getHealth() {
    return {
      status: 'ok',
      driver: demoBackend.driver,
      mode: 'demo',
    };
  }

  @ApiOperation({
    summary: 'Read the greeting assembled from live config values',
  })
  @ApiOkResponse({
    description: 'Greeting response using the current live config.',
  })
  @Get('consumer/greeting')
  public async getGreeting() {
    return {
      greeting: await this.appService.getGreeting(),
    };
  }

  @ApiOperation({ summary: 'Read the live-config message value' })
  @ApiOkResponse({
    description: 'Current message value and the applied read options.',
  })
  @Get('settings/message')
  public async getMessage(@Query() query: LiveConfigReadQueryDto) {
    return {
      value: await this.appService.getMessage(query),
      options: query,
    };
  }

  @ApiOperation({ summary: 'Update the live-config message value' })
  @ApiBody({ type: UpdateLiveConfigValueDto })
  @ApiOkResponse({ description: 'Updated message value.' })
  @Put('settings/message')
  public async setMessage(@Body() body: UpdateLiveConfigValueDto) {
    return {
      value: await this.appService.setMessage(body.value),
    };
  }

  @ApiOperation({ summary: 'Read the live-config theme value' })
  @ApiOkResponse({
    description: 'Current theme value and the applied read options.',
  })
  @Get('settings/theme')
  public async getTheme(@Query() query: LiveConfigReadQueryDto) {
    return {
      value: await this.appService.getTheme(query),
      options: query,
    };
  }

  @ApiOperation({ summary: 'Update the live-config theme value' })
  @ApiBody({ type: UpdateThemeValueDto })
  @ApiOkResponse({ description: 'Updated theme value.' })
  @Put('settings/theme')
  public async setTheme(@Body() body: UpdateThemeValueDto) {
    return {
      value: await this.appService.setTheme(body.value),
    };
  }
}
