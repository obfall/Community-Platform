import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BoardTopicsService } from "./board-topics.service";
import { CreateTopicDto, UpdateTopicDto, TopicQueryDto, ReorderItemsDto } from "./dto";
import { CurrentUser, FeatureEnabled, Roles } from "@/common/decorators";
import { FeatureEnabledGuard, RolesGuard } from "@/common/guards";

@ApiTags("board")
@ApiBearerAuth()
@FeatureEnabled("board")
@UseGuards(FeatureEnabledGuard)
@Controller("board/topics")
export class BoardTopicsController {
  constructor(private readonly topicsService: BoardTopicsService) {}

  @Get()
  @ApiOperation({ summary: "トピック一覧" })
  findAll(@CurrentUser("id") userId: string, @Query() query: TopicQueryDto) {
    return this.topicsService.findAll(userId, query);
  }

  @Patch("reorder")
  @Roles("owner", "admin", "moderator")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "トピック並び替え" })
  reorder(@Body() dto: ReorderItemsDto) {
    return this.topicsService.reorder(dto.items);
  }

  @Get(":id")
  @ApiOperation({ summary: "トピック詳細" })
  findOne(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.topicsService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: "トピック作成" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateTopicDto) {
    return this.topicsService.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "トピック更新" })
  update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicDto,
  ) {
    return this.topicsService.update(userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "トピック削除" })
  remove(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.topicsService.softDelete(userId, id);
  }

  @Patch(":id/pin")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "トピックピン留めトグル" })
  togglePin(@Param("id", ParseUUIDPipe) id: string) {
    return this.topicsService.togglePin(id);
  }
}
