import { Module } from '@nestjs/common';

import { LiveConfigModule } from '@nestjs-live-configs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { createDemoBackend } from './live-config-backend.js';

const backend = createDemoBackend(process.env);

@Module({
  imports: [
    LiveConfigModule.forRoot({
      adapter: backend.adapter,
      defaults: backend.defaults,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
