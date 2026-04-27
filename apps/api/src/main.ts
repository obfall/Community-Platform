import "./instrument";

import { NestFactory } from "@nestjs/core";
import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import { ErrorCode } from "@community-platform/shared";
import { AppModule } from "./app.module";
import { BusinessException } from "./common/exceptions";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix("api", {
    exclude: ["/", "/health"],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const errorDetails = errors.flatMap((e) =>
          Object.entries(e.constraints ?? {}).map(([rule, message]) => ({
            field: e.property,
            rule,
            message,
          })),
        );
        return new BusinessException(
          ErrorCode.VALIDATION_FAILED,
          HttpStatus.BAD_REQUEST,
          "入力内容に誤りがあります",
          errorDetails,
        );
      },
    }),
  );

  // Swagger
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Community Platform API")
      .setDescription("Community Platform Backend API")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
    logger.log("Swagger documentation available at /docs");
  }

  const port = parseInt(process.env.PORT || "4000", 10);
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

void bootstrap();
