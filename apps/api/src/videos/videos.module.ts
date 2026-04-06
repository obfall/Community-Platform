import { Module } from "@nestjs/common";
import { FilesModule } from "@/files/files.module";
import { VideosController } from "./videos.controller";
import { VideosService } from "./videos.service";
import { VideoProcessorService } from "./video-processor.service";

@Module({
  imports: [FilesModule],
  controllers: [VideosController],
  providers: [VideosService, VideoProcessorService],
  exports: [VideosService],
})
export class VideosModule {}
