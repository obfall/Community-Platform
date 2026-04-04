import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { MailMessagesService } from "./mail-messages.service";
import { MailTemplatesService } from "./mail-templates.service";
import { MailSuppressionsService } from "./mail-suppressions.service";
import { CreateMailMessageDto } from "./dto/create-mail-message.dto";
import { UpdateMailMessageDto } from "./dto/update-mail-message.dto";
import { MailMessageQueryDto } from "./dto/mail-query.dto";
import { CreateMailTemplateDto } from "./dto/create-mail-template.dto";
import { UpdateMailTemplateDto } from "./dto/update-mail-template.dto";
import { CreateMailSuppressionDto } from "./dto/create-mail-suppression.dto";

@Controller("mail")
@ApiTags("Mail")
@ApiBearerAuth()
@FeatureEnabled("mail_campaign")
@UseGuards(FeatureEnabledGuard, RolesGuard)
@Roles("owner", "admin")
export class MailController {
  constructor(
    private readonly messagesService: MailMessagesService,
    private readonly templatesService: MailTemplatesService,
    private readonly suppressionsService: MailSuppressionsService,
  ) {}

  // --- Messages ---

  @Get("messages")
  @ApiOperation({ summary: "配信一覧" })
  findMessages(@Query() query: MailMessageQueryDto) {
    return this.messagesService.findAll(query);
  }

  @Post("messages")
  @ApiOperation({ summary: "メッセージ作成（下書き）" })
  createMessage(@CurrentUser("id") userId: string, @Body() dto: CreateMailMessageDto) {
    return this.messagesService.create(userId, dto);
  }

  @Get("messages/:id")
  @ApiOperation({ summary: "メッセージ詳細（配信状況含む）" })
  findMessage(@Param("id", ParseUUIDPipe) id: string) {
    return this.messagesService.findOne(id);
  }

  @Patch("messages/:id")
  @ApiOperation({ summary: "メッセージ更新（下書き時のみ）" })
  updateMessage(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateMailMessageDto) {
    return this.messagesService.update(id, dto);
  }

  @Post("messages/:id/send")
  @ApiOperation({ summary: "送信実行" })
  sendMessage(@Param("id", ParseUUIDPipe) id: string) {
    return this.messagesService.send(id);
  }

  // --- Templates ---

  @Get("templates")
  @ApiOperation({ summary: "テンプレート一覧" })
  findTemplates() {
    return this.templatesService.findAll();
  }

  @Post("templates")
  @ApiOperation({ summary: "テンプレート作成" })
  createTemplate(@Body() dto: CreateMailTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Patch("templates/:id")
  @ApiOperation({ summary: "テンプレート更新" })
  updateTemplate(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateMailTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete("templates/:id")
  @ApiOperation({ summary: "テンプレート削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTemplate(@Param("id", ParseUUIDPipe) id: string) {
    return this.templatesService.remove(id);
  }

  // --- Suppressions ---

  @Get("suppressions")
  @ApiOperation({ summary: "配信停止リスト" })
  findSuppressions() {
    return this.suppressionsService.findAll();
  }

  @Post("suppressions")
  @ApiOperation({ summary: "配信停止追加" })
  createSuppression(@Body() dto: CreateMailSuppressionDto) {
    return this.suppressionsService.create(dto);
  }

  @Delete("suppressions/:id")
  @ApiOperation({ summary: "配信停止解除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSuppression(@Param("id", ParseUUIDPipe) id: string) {
    return this.suppressionsService.remove(id);
  }
}
