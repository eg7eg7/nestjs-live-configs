import { Module } from '@nestjs/common';

import { LiveConfigModule } from '../../../src/index.ts';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { createDemoBackend } from './live-config-backend.ts';

const backend = createDemoBackend(process.env);

@Module({
  imports: [
    LiveConfigModule.forRoot({
      store: backend.store,
      sync: backend.sync,
      defaults: backend.defaults,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
