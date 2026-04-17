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
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { ApplicationFormService } from "./application-form.service";
import { UpsertApplicationFormConfigDto } from "./dto/upsert-application-form-config.dto";
import {
  CreateApplicationQuestionDto,
  UpdateApplicationQuestionDto,
  ReorderQuestionsDto,
} from "./dto/application-question.dto";

@Controller("events/:eventId/application-form")
@ApiTags("Event Application Form")
@ApiBearerAuth()
@FeatureEnabled("event")
@UseGuards(FeatureEnabledGuard)
export class ApplicationFormController {
  constructor(private readonly applicationFormService: ApplicationFormService) {}

  @Get()
  @ApiOperation({ summary: "申込フォーム設定 + 質問一覧（admin）" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  getForm(@Param("eventId", ParseUUIDPipe) eventId: string) {
    return this.applicationFormService.getForm(eventId);
  }

  @Get("public")
  @ApiOperation({ summary: "申込フォーム設定 + 質問一覧（公開）" })
  getFormPublic(@Param("eventId", ParseUUIDPipe) eventId: string) {
    return this.applicationFormService.getFormPublic(eventId);
  }

  @Put("config")
  @ApiOperation({ summary: "申込フォーム設定を更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  upsertConfig(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: UpsertApplicationFormConfigDto,
  ) {
    return this.applicationFormService.upsertConfig(eventId, dto);
  }

  @Post("questions")
  @ApiOperation({ summary: "質問追加" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createQuestion(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: CreateApplicationQuestionDto,
  ) {
    return this.applicationFormService.createQuestion(eventId, dto);
  }

  @Patch("questions/reorder")
  @ApiOperation({ summary: "質問並び順一括更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  reorderQuestions(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.applicationFormService.reorderQuestions(eventId, dto);
  }

  @Patch("questions/:questionId")
  @ApiOperation({ summary: "質問更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  updateQuestion(
    @Param("questionId", ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateApplicationQuestionDto,
  ) {
    return this.applicationFormService.updateQuestion(questionId, dto);
  }

  @Delete("questions/:questionId")
  @ApiOperation({ summary: "質問削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteQuestion(@Param("questionId", ParseUUIDPipe) questionId: string) {
    return this.applicationFormService.deleteQuestion(questionId);
  }
}
