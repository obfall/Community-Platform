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
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { FeatureEnabledGuard } from "@/common/guards";
import { ContentsService } from "./contents.service";
import { CreateContentDto } from "./dto";

@Controller("contents")
@ApiTags("Contents")
@ApiBearerAuth()
@FeatureEnabled("content")
@UseGuards(FeatureEnabledGuard)
export class ContentsController {
  constructor(private readonly service: ContentsService) {}

  @Get()
  @ApiOperation({ summary: "コンテンツ一覧" })
  findAll(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      contentType?: string;
      publishStatus?: string;
    },
  ) {
    return this.service.findAll(query);
  }

  @Get("share/:token")
  @ApiOperation({ summary: "招待トークンでコンテンツ取得" })
  findByToken(@Param("token") token: string) {
    return this.service.findByInviteToken(token);
  }

  @Get(":id")
  @ApiOperation({ summary: "コンテンツ詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "コンテンツ作成" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateContentDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "コンテンツ更新" })
  update(
    @CurrentUser() currentUser: { id: string; role: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: { name?: string; description?: string; price?: number; publishStatus?: string },
  ) {
    return this.service.update(id, data, currentUser);
  }

  @Delete(":id")
  @ApiOperation({ summary: "コンテンツ削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() currentUser: { id: string; role: string },
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(id, currentUser);
  }
}
