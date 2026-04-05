import { Module } from "@nestjs/common";
import {
  MemberAttributesController,
  UserAttributesController,
} from "./member-attributes.controller";
import { MemberAttributesService } from "./member-attributes.service";

@Module({
  controllers: [MemberAttributesController, UserAttributesController],
  providers: [MemberAttributesService],
  exports: [MemberAttributesService],
})
export class MemberAttributesModule {}
