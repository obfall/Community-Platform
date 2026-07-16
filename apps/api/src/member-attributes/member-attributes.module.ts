import { Module } from "@nestjs/common";
import {
  MemberAttributesController,
  UserAttributesController,
} from "./member-attributes.controller";
import { MemberAttributesService } from "./member-attributes.service";
import { UsersModule } from "@/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [MemberAttributesController, UserAttributesController],
  providers: [MemberAttributesService],
  exports: [MemberAttributesService],
})
export class MemberAttributesModule {}
