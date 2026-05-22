import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const port = config.get<number>("API_PORT", 4000);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>("WEB_ORIGIN", "http://localhost:3000"),
    credentials: true
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("NexaERP API")
      .setDescription("Multi-tenant ERP API")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build()
  );
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
}

void bootstrap();
