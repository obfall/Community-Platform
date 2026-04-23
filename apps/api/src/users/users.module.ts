import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { AuthModule } from "@/auth/auth.module";
import { BroadcastsModule } from "@/broadcasts/broadcasts.module";

@Module({
  imports: [AuthModule, BroadcastsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
