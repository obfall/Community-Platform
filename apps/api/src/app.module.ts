import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { SentryModule } from "@sentry/nestjs/setup";
import { LoggerModule } from "nestjs-pino";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { I18nModule, AcceptLanguageResolver, CookieResolver, HeaderResolver } from "nestjs-i18n";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { CacheModule } from "./cache/cache.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { SettingsModule } from "./settings/settings.module";
import { FilesModule } from "./files/files.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { BoardModule } from "./board/board.module";
import { ChatModule } from "./chat/chat.module";
import { BroadcastsModule } from "./broadcasts/broadcasts.module";
import { MemberAttributesModule } from "./member-attributes/member-attributes.module";
import { EventsModule } from "./events/events.module";
import { EventBoardModule } from "./events/board/event-board.module";
import { ProjectsModule } from "./projects/projects.module";
import { ProjectBoardModule } from "./projects/board/project-board.module";
import { VideosModule } from "./videos/videos.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { PointsModule } from "./points/points.module";
import { SurveysModule } from "./surveys/surveys.module";
import { SkillsModule } from "./skills/skills.module";
import { ShopModule } from "./shop/shop.module";
import { AlbumsModule } from "./albums/albums.module";
import { VenuesModule } from "./venues/venues.module";
import { ContentsModule } from "./contents/contents.module";
import { FaqModule } from "./faq/faq.module";
import { MemosModule } from "./memos/memos.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { ModerationModule } from "./moderation/moderation.module";
import { OrientationModule } from "./orientation/orientation.module";
import { UserLibraryModule } from "./user-library/user-library.module";
import { UsageHistoryModule } from "./usage-history/usage-history.module";
import { JwtAuthGuard } from "./common/guards";
import { AllExceptionsFilter } from "./common/filters";
import { SentryUserInterceptor } from "./common/interceptors";
import { validateEnv } from "./config/env.config";

@Module({
  imports: [
    // Sentry must be first
    SentryModule.forRoot(),

    // Environment configuration with Zod validation
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // レートリミット（IP ベース、メモリストレージ）。
    // 注意: @nestjs/throttler v6 では forRoot の配列に複数 throttler を入れると
    // 全てが全ルートに適用される（最小値が実効値になる）。そのため strict / upload は
    // ここでは登録せず、各コントローラ側で `@Throttle({ default: { limit, ttl } })` で
    // インライン上書きする運用にする。
    // dev 環境では HMR + React Query の refetch で 60 req/min が簡単に飽和するため大幅に緩和。
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: process.env.NODE_ENV === "production" ? 60 : 600,
      },
    ]),

    // Structured logging (pino)
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        // x-request-id を受信 or 自動生成し、レスポンスにも付与
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const incoming = req.headers["x-request-id"];
          const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
          res.setHeader("x-request-id", id);
          return id;
        },
        // 機密情報はログから除外
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.headers['set-cookie']",
            "req.body.password",
            "req.body.passwordHash",
            "req.body.refreshToken",
            "req.body.accessToken",
            "*.password",
            "*.passwordHash",
            "*.token",
            "*.secret",
          ],
          remove: true,
        },
        // ログのリクエスト/レスポンス表現を簡潔に
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
        // 1 秒を超えるリクエストは "slow request: METHOD URL" でマークし grep / アラート可能に
        customSuccessMessage: (req, res, responseTime) => {
          if (responseTime > 1000) {
            return `slow request: ${req.method ?? "?"} ${req.url ?? "?"}`;
          }
          return "request completed";
        },
        // 開発時は色付き整形、本番は JSON のまま
        transport:
          process.env.NODE_ENV !== "production"
            ? {
                target: "pino-pretty",
                options: {
                  colorize: true,
                  translateTime: "SYS:HH:MM:ss",
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),

    // BullMQ（Redis が設定されている場合のみ有効）
    ...(process.env.REDIS_HOST
      ? [
          BullModule.forRoot({
            connection: {
              host: process.env.REDIS_HOST,
              port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
            },
          }),
        ]
      : []),

    // i18n（メッセージカタログ。AllExceptionsFilter / ValidationPipe で参照）
    // MVP は ja のみで動作。resolver は将来用に最小限を残してあり、en 等を足すと自動で切替えできる。
    I18nModule.forRoot({
      fallbackLanguage: "ja",
      loaderOptions: {
        path: join(__dirname, "/i18n/messages/"),
        watch: process.env.NODE_ENV !== "production",
      },
      resolvers: [
        { use: HeaderResolver, options: ["x-locale"] },
        new CookieResolver(["NEXT_LOCALE"]),
        AcceptLanguageResolver,
      ],
    }),

    // Database
    PrismaModule,

    // Global cache (Redis if REDIS_HOST set, otherwise no-op)
    CacheModule,

    // Auth
    AuthModule,

    // Member Attributes (must be before UsersModule for route priority)
    MemberAttributesModule,

    // Users
    UsersModule,

    // Settings
    SettingsModule,

    // Files
    FilesModule,

    // Notifications
    NotificationsModule,

    // Board
    BoardModule,

    // Chat
    ChatModule,

    // Broadcasts（旧 Mail）
    BroadcastsModule,

    // Events
    EventsModule,
    EventBoardModule,

    // Projects
    ProjectsModule,
    ProjectBoardModule,

    // Videos
    VideosModule,

    // Analytics
    AnalyticsModule,

    // Points
    PointsModule,

    // Surveys
    SurveysModule,

    // Skills
    SkillsModule,

    // Shop
    ShopModule,

    // Albums
    AlbumsModule,

    // Venues
    VenuesModule,

    // Contents
    ContentsModule,

    // FAQ
    FaqModule,

    // Memos
    MemosModule,

    // Schedules
    SchedulesModule,

    // Moderation
    ModerationModule,

    // Orientation
    OrientationModule,
    UserLibraryModule,

    // Usage History（admin/owner 向け監査ログ）
    UsageHistoryModule,
  ],
  controllers: [AppController],
  providers: [
    // Global exception filter（統一レスポンス + 構造化ログ + Sentry 送信）
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global rate limit guard（@SkipThrottle で除外、@Throttle で個別調整可）
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT auth guard (use @Public() to skip)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Sentry に認証ユーザー id を紐付け（PII 回避のため id のみ）
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryUserInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}
