import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const port = 3000;
  await app.listen(process.env.PORT ?? port);

  logger.log(`🚀 Application running at: http://localhost:${port}`);
}

bootstrap();
