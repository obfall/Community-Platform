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
import { BoardTopicPostCommentsService } from "./board-topic-post-comments.service";
import { CreateTopicPostCommentDto, UpdateTopicPostCommentDto } from "./dto";
import { CurrentUser, FeatureEnabled } from "@/common/decorators";
import { FeatureEnabledGuard } from "@/common/guards";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

@ApiTags("board")
@ApiBearerAuth()
@FeatureEnabled("board")
@UseGuards(FeatureEnabledGuard)
@Controller("board")
export class BoardTopicPostCommentsController {
  constructor(private readonly commentsService: BoardTopicPostCommentsService) {}

  @Get("topic-posts/:postId/comments")
  @ApiOperation({ summary: "トピック投稿コメント一覧" })
  findAll(
    @CurrentUser("id") userId: string,
    @Param("postId", ParseUUIDPipe) postId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.findAll(userId, postId, query);
  }

  @Post("topic-posts/:postId/comments")
  @ApiOperation({ summary: "トピック投稿コメント作成" })
  create(
    @CurrentUser("id") userId: string,
    @Param("postId", ParseUUIDPipe) postId: string,
    @Body() dto: CreateTopicPostCommentDto,
  ) {
    return this.commentsService.create(userId, postId, dto);
  }

  @Patch("topic-post-comments/:id")
  @ApiOperation({ summary: "トピック投稿コメント更新" })
  update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicPostCommentDto,
  ) {
    return this.commentsService.update(userId, id, dto);
  }

  @Delete("topic-post-comments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "トピック投稿コメント削除" })
  remove(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.commentsService.softDelete(userId, id);
  }
}
