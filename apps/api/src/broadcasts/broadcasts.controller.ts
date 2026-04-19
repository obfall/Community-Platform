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
import { BroadcastsService } from "./broadcasts.service";
import { BroadcastTemplatesService } from "./broadcast-templates.service";
import { BroadcastSuppressionsService } from "./broadcast-suppressions.service";
import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { BroadcastQueryDto } from "./dto/broadcast-query.dto";
import { CreateBroadcastTemplateDto } from "./dto/create-broadcast-template.dto";
import { UpdateBroadcastTemplateDto } from "./dto/update-broadcast-template.dto";
import { CreateBroadcastSuppressionDto } from "./dto/create-broadcast-suppression.dto";

@Controller("broadcasts")
@ApiTags("Broadcasts")
@ApiBearerAuth()
@FeatureEnabled("mail_campaign")
@UseGuards(FeatureEnabledGuard, RolesGuard)
@Roles("admin", "owner")
export class BroadcastsController {
  constructor(
    private readonly broadcasts: BroadcastsService,
    private readonly templates: BroadcastTemplatesService,
    private readonly suppressions: BroadcastSuppressionsService,
  ) {}

  // --- Broadcasts ---

  @Get()
  @ApiOperation({ summary: "配信一覧" })
  findAll(@Query() query: BroadcastQueryDto) {
    return this.broadcasts.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: "配信作成・送信" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateBroadcastDto) {
    return this.broadcasts.create(userId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "配信詳細（配信状況含む）" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.broadcasts.findOne(id);
  }

  @Post(":id/send")
  @ApiOperation({ summary: "送信実行" })
  send(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.broadcasts.send(id, userId);
  }

  // --- Templates ---

  @Get("templates")
  @ApiOperation({ summary: "テンプレート一覧" })
  findTemplates() {
    return this.templates.findAll();
  }

  @Post("templates")
  @ApiOperation({ summary: "テンプレート作成" })
  createTemplate(@Body() dto: CreateBroadcastTemplateDto) {
    return this.templates.create(dto);
  }

  @Patch("templates/:id")
  @ApiOperation({ summary: "テンプレート更新" })
  updateTemplate(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBroadcastTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Delete("templates/:id")
  @ApiOperation({ summary: "テンプレート削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTemplate(@Param("id", ParseUUIDPipe) id: string) {
    return this.templates.remove(id);
  }

  // --- Suppressions ---

  @Get("suppressions")
  @ApiOperation({ summary: "配信停止リスト" })
  findSuppressions() {
    return this.suppressions.findAll();
  }

  @Post("suppressions")
  @ApiOperation({ summary: "配信停止追加" })
  createSuppression(@Body() dto: CreateBroadcastSuppressionDto) {
    return this.suppressions.create(dto);
  }

  @Delete("suppressions/:id")
  @ApiOperation({ summary: "配信停止解除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSuppression(@Param("id", ParseUUIDPipe) id: string) {
    return this.suppressions.remove(id);
  }
}
