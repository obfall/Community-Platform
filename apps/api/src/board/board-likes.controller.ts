import { Controller, Post, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BoardLikesService } from "./board-likes.service";
import { CurrentUser, FeatureEnabled } from "@/common/decorators";
import { FeatureEnabledGuard } from "@/common/guards";

@ApiTags("board")
@ApiBearerAuth()
@FeatureEnabled("board")
@UseGuards(FeatureEnabledGuard)
@Controller("board")
export class BoardLikesController {
  constructor(private readonly likesService: BoardLikesService) {}

  @Post("posts/:id/like")
  @ApiOperation({ summary: "投稿いいねトグル" })
  togglePostLike(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.likesService.togglePostLike(userId, id);
  }

  @Post("comments/:id/like")
  @ApiOperation({ summary: "コメントいいねトグル" })
  toggleCommentLike(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.likesService.toggleCommentLike(userId, id);
  }

  @Post("topics/:id/like")
  @ApiOperation({ summary: "トピックいいねトグル" })
  toggleTopicLike(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.likesService.toggleTopicLike(userId, id);
  }

  @Post("topic-posts/:id/like")
  @ApiOperation({ summary: "トピック投稿いいねトグル" })
  toggleTopicPostLike(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.likesService.toggleTopicPostLike(userId, id);
  }

  @Post("topic-post-comments/:id/like")
  @ApiOperation({ summary: "トピック投稿コメントいいねトグル" })
  toggleTopicPostCommentLike(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.likesService.toggleTopicPostCommentLike(userId, id);
  }
}
