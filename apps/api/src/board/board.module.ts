import { Module } from "@nestjs/common";
import { BoardCategoriesController } from "./board-categories.controller";
import { BoardCategoriesService } from "./board-categories.service";
import { BoardPostsController } from "./board-posts.controller";
import { BoardPostsService } from "./board-posts.service";
import { BoardCommentsController } from "./board-comments.controller";
import { BoardCommentsService } from "./board-comments.service";
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
    BoardPostsController,
    BoardCommentsController,
    BoardTopicsController,
    BoardTopicPostsController,
    BoardTopicPostCommentsController,
    BoardLikesController,
  ],
  providers: [
    BoardCategoriesService,
    BoardPostsService,
    BoardCommentsService,
    BoardTopicsService,
    BoardTopicPostsService,
    BoardTopicPostCommentsService,
    BoardLikesService,
  ],
  exports: [BoardPostsService, BoardCommentsService, BoardTopicsService],
})
export class BoardModule {}
