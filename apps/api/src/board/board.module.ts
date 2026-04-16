import { Module } from "@nestjs/common";
import { BoardCoreService } from "./core/board-core.service";
import { BoardCategoriesController } from "./board-categories.controller";
import { BoardCategoriesService } from "./board-categories.service";
import { BoardTopicsController } from "./board-topics.controller";
import { BoardTopicsService } from "./board-topics.service";
import { BoardTopicPostsController } from "./board-topic-posts.controller";
import { BoardTopicPostsService } from "./board-topic-posts.service";
import { BoardTopicPostCommentsController } from "./board-topic-post-comments.controller";
import { BoardTopicPostCommentsService } from "./board-topic-post-comments.service";
import { BoardLikesController } from "./board-likes.controller";
import { BoardLikesService } from "./board-likes.service";

@Module({
  controllers: [
    BoardCategoriesController,
    BoardTopicsController,
    BoardTopicPostsController,
    BoardTopicPostCommentsController,
    BoardLikesController,
  ],
  providers: [
    BoardCoreService,
    BoardCategoriesService,
    BoardTopicsService,
    BoardTopicPostsService,
    BoardTopicPostCommentsService,
    BoardLikesService,
  ],
  exports: [BoardCoreService, BoardTopicsService],
})
export class BoardModule {}
