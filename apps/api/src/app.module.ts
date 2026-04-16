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
import { AnnouncementsModule } from "./announcements/announcements.module";
import { FaqModule } from "./faq/faq.module";
import { MemosModule } from "./memos/memos.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { ModerationModule } from "./moderation/moderation.module";
import { OrientationModule } from "./orientation/orientation.module";
import { UserLibraryModule } from "./user-library/user-library.module";
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

    // Mail
    MailModule,

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

    // Announcements
    AnnouncementsModule,

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
