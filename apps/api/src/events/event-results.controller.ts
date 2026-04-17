import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { FeatureEnabledGuard } from "@/common/guards";
import { EventResultsService } from "./event-results.service";
import {
  UpsertEventResultDto,
  AttachResultFileDto,
  ReorderResultAttachmentsDto,
} from "./dto/upsert-event-result.dto";

type AuthUser = { id: string; role: string };

@Controller("events/:id/result")
@ApiTags("Event Results")
@ApiBearerAuth()
@FeatureEnabled("event")
@UseGuards(FeatureEnabledGuard)
export class EventResultsController {
  constructor(private readonly service: EventResultsService) {}

  @Get()
  @ApiOperation({ summary: "実施結果の取得（公開判定付き）" })
  get(@Param("id", ParseUUIDPipe) eventId: string, @CurrentUser() user: AuthUser) {
    return this.service.get(eventId, user);
  }

  @Put()
  @ApiOperation({ summary: "実施結果の作成 or 更新（admin / 作成者）" })
  upsert(
    @Param("id", ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertEventResultDto,
  ) {
    return this.service.upsert(eventId, user, dto);
  }

  @Delete()
  @ApiOperation({ summary: "実施結果の削除（admin / 作成者）" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) eventId: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(eventId, user);
  }

  @Post("attachments")
  @ApiOperation({ summary: "添付ファイル追加（admin / 作成者）" })
  addAttachment(
    @Param("id", ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AttachResultFileDto,
  ) {
    return this.service.addAttachment(eventId, user, dto);
  }

  @Patch("attachments/reorder")
  @ApiOperation({ summary: "添付ファイル並び替え（admin / 作成者）" })
  reorderAttachments(
    @Param("id", ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderResultAttachmentsDto,
  ) {
    return this.service.reorderAttachments(eventId, user, dto);
  }

  @Delete("attachments/:attachmentId")
  @ApiOperation({ summary: "添付ファイル削除（admin / 作成者）" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAttachment(
    @Param("id", ParseUUIDPipe) eventId: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeAttachment(eventId, attachmentId, user);
  }
}
