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
import { BoardTopicPostsService } from "./board-topic-posts.service";
import { CreateTopicPostDto, UpdateTopicPostDto } from "./dto";
import { CurrentUser, FeatureEnabled } from "@/common/decorators";
import { FeatureEnabledGuard } from "@/common/guards";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

@ApiTags("board")
@ApiBearerAuth()
@FeatureEnabled("board")
@UseGuards(FeatureEnabledGuard)
@Controller("board")
export class BoardTopicPostsController {
  constructor(private readonly postsService: BoardTopicPostsService) {}

  @Get("topics/:topicId/posts")
  @ApiOperation({ summary: "トピック投稿一覧" })
  findAll(
    @CurrentUser("id") userId: string,
    @Param("topicId", ParseUUIDPipe) topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.postsService.findAll(userId, topicId, query);
  }

  @Post("topics/:topicId/posts")
  @ApiOperation({ summary: "トピック投稿作成" })
  create(
    @CurrentUser("id") userId: string,
    @Param("topicId", ParseUUIDPipe) topicId: string,
    @Body() dto: CreateTopicPostDto,
  ) {
    return this.postsService.create(userId, topicId, dto);
  }

  @Patch("topic-posts/:id")
  @ApiOperation({ summary: "トピック投稿更���" })
  update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicPostDto,
  ) {
    return this.postsService.update(userId, id, dto);
  }

  @Delete("topic-posts/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "トピック投稿削除" })
  remove(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.postsService.softDelete(userId, id);
  }
}
