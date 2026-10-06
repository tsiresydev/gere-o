import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './common/setup-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app);

  const corsOrigins = configService.get<string[]>('corsOrigins');
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  Logger.log(`API disponible sur http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
