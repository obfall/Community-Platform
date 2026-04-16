import { Module } from "@nestjs/common";
import { BoardModule } from "@/board/board.module";
import { EventBoardController } from "./event-board.controller";
import { EventBoardService } from "./event-board.service";

@Module({
  imports: [BoardModule],
  controllers: [EventBoardController],
  providers: [EventBoardService],
})
export class EventBoardModule {}
