import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? '3000');
  const docsPath = 'docs';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('nestjs-live-configs demo')
    .setDescription(
      'Demo NestJS app for exploring live configuration reads, updates, and backend-specific sync behavior.',
    )
    .setVersion('0.1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(docsPath, app, swaggerDocument, {
    jsonDocumentUrl: `${docsPath}/json`,
  });

  await app.listen(port, host);
  console.log(`Demo app listening on http://${host}:${port}`);
  console.log(`Swagger docs available at http://${host}:${port}/${docsPath}`);
}

void bootstrap();
