import { Module } from "@nestjs/common";
import { UsageHistoryController } from "./usage-history.controller";
import { UsageHistoryService } from "./usage-history.service";

@Module({
  controllers: [UsageHistoryController],
  providers: [UsageHistoryService],
})
export class UsageHistoryModule {}
