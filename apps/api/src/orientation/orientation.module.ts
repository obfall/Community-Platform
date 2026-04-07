import { Module } from "@nestjs/common";
import { OrientationController } from "./orientation.controller";
import { OrientationService } from "./orientation.service";

@Module({
  controllers: [OrientationController],
  providers: [OrientationService],
  exports: [OrientationService],
})
export class OrientationModule {}
