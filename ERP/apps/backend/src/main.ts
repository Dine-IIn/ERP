import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  const apiVersion = config.get<string>('API_VERSION', 'v1');

  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  await app.listen(config.get<number>('APP_PORT', 3000));
}

void bootstrap();
