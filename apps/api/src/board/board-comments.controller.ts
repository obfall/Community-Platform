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
import { BoardCommentsService } from "./board-comments.service";
import { CreateCommentDto, UpdateCommentDto } from "./dto";
import { CurrentUser, FeatureEnabled } from "@/common/decorators";
import { FeatureEnabledGuard } from "@/common/guards";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

@ApiTags("board")
@ApiBearerAuth()
@FeatureEnabled("board")
@UseGuards(FeatureEnabledGuard)
@Controller("board")
export class BoardCommentsController {
  constructor(private readonly commentsService: BoardCommentsService) {}

  @Get("posts/:postId/comments")
  @ApiOperation({ summary: "コメント一覧" })
  findAll(
    @CurrentUser("id") userId: string,
    @Param("postId", ParseUUIDPipe) postId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.findAll(userId, postId, query);
  }

  @Post("posts/:postId/comments")
  @ApiOperation({ summary: "コメント作成" })
  create(
    @CurrentUser("id") userId: string,
    @Param("postId", ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(userId, postId, dto);
  }

  @Patch("comments/:id")
  @ApiOperation({ summary: "コメント更新" })
  update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(userId, id, dto);
  }

  @Delete("comments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "コメント削除" })
  remove(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.commentsService.softDelete(userId, id);
  }
}
