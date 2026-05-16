import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { NotificationsService } from "./notifications.service";
import { NotificationQueryDto, UpdatePreferencesDto } from "./dto";
import { CurrentUser, FeatureEnabled } from "@/common/decorators";
import { FeatureEnabledGuard } from "@/common/guards/feature-enabled.guard";

@ApiTags("notifications")
@ApiBearerAuth()
@FeatureEnabled("notification")
@UseGuards(FeatureEnabledGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "通知一覧" })
  findAll(@CurrentUser("id") userId: string, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findAll(userId, query);
  }

  // UI 通知バッジ用に高頻度（30〜60秒間隔）でポーリングされる軽量 COUNT クエリのため
  // throttle 対象から外す（per-user JWT 認証済みで悪用リスクも低い）
  @SkipThrottle()
  @Get("unread-count")
  @ApiOperation({ summary: "未読通知数" })
  getUnreadCount(@CurrentUser("id") userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get("preferences")
  @ApiOperation({ summary: "通知設定一覧" })
  getPreferences(@CurrentUser("id") userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "全通知を既読にする" })
  markAllAsRead(@CurrentUser("id") userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "通知を既読にする" })
  markAsRead(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Put("preferences")
  @ApiOperation({ summary: "通知設定を一括更新" })
  updatePreferences(@CurrentUser("id") userId: string, @Body() dto: UpdatePreferencesDto) {
    return this.notificationsService.updatePreferences(userId, dto);
  }
}
