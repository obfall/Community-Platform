import { Module } from "@nestjs/common";
import { BoardCategoriesController } from "./board-categories.controller";
import { BoardCategoriesService } from "./board-categories.service";
import { BoardPostsController } from "./board-posts.controller";
import { BoardPostsService } from "./board-posts.service";
import { BoardCommentsController } from "./board-comments.controller";
import { BoardCommentsService } from "./board-comments.service";
import { BoardLikesController } from "./board-likes.controller";
import { BoardLikesService } from "./board-likes.service";

@Module({
  controllers: [
    BoardCategoriesController,
    BoardPostsController,
    BoardCommentsController,
    BoardLikesController,
  ],
  providers: [BoardCategoriesService, BoardPostsService, BoardCommentsService, BoardLikesService],
  exports: [BoardPostsService, BoardCommentsService],
})
export class BoardModule {}
