import "./instrument";

import { NestFactory } from "@nestjs/core";
import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import compression from "compression";
import { ErrorCode } from "@community-platform/shared";
import { AppModule } from "./app.module";
import { BusinessException } from "./common/exceptions";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  // gzip 圧縮（JSON レスポンスは 60-80% 削減見込み）。Cloudflare 経由でも二重圧縮にはならない。
  app.use(compression());

  // Security headers（API は CSP 不要、Web 側で設定）
  app.use(
    helmet({
      contentSecurityPolicy: false,
      hsts: {
        maxAge: 31_536_000, // 1 年
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      frameguard: { action: "deny" },
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      hidePoweredBy: true,
      noSniff: true,
      xssFilter: true,
    }),
  );

  // CORS（カンマ区切り複数 origin 対応）
  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Requested-With"],
    exposedHeaders: ["X-Request-Id"], // フロントが requestId を読み取れるように
    maxAge: 86_400, // preflight キャッシュ 24h
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
          "errors.validation_failed",
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
