import { Module } from "@nestjs/common";
import { BoardModule } from "@/board/board.module";
import { ProjectBoardController } from "./project-board.controller";
import { ProjectBoardService } from "./project-board.service";

@Module({
  imports: [BoardModule],
  controllers: [ProjectBoardController],
  providers: [ProjectBoardService],
})
export class ProjectBoardModule {}
