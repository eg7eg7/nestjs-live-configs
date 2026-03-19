import { Module } from '@nestjs/common';

import { LiveConfigModule } from '@nestjs-live-configs/core';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { createDemoBackend } from './live-config-backend.ts';

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
