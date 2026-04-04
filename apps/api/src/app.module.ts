import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { SentryModule, SentryGlobalFilter } from "@sentry/nestjs/setup";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { SettingsModule } from "./settings/settings.module";
import { FilesModule } from "./files/files.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { BoardModule } from "./board/board.module";
import { ChatModule } from "./chat/chat.module";
import { MailModule } from "./mail/mail.module";
import { JwtAuthGuard } from "./common/guards";
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

    // Database
    PrismaModule,

    // Auth
    AuthModule,

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

    // Mail
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    // Sentry global exception filter
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    // Global JWT auth guard (use @Public() to skip)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AppService,
  ],
})
export class AppModule {}
