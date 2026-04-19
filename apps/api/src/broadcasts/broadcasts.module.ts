import { Module } from "@nestjs/common";
import { NotificationsModule } from "@/notifications/notifications.module";
import { EmailService } from "./email.service";
import { BroadcastsController } from "./broadcasts.controller";
import { BroadcastsService } from "./broadcasts.service";
import { BroadcastTemplatesService } from "./broadcast-templates.service";
import { BroadcastSuppressionsService } from "./broadcast-suppressions.service";
import { BroadcastDispatcher } from "./dispatchers/broadcast-dispatcher";
import { InAppDispatcher } from "./dispatchers/in-app.dispatcher";
import { EmailDispatcher } from "./dispatchers/email.dispatcher";
import { LineDispatcher } from "./dispatchers/line.dispatcher";

@Module({
  imports: [NotificationsModule],
  controllers: [BroadcastsController],
  providers: [
    EmailService,
    BroadcastsService,
    BroadcastTemplatesService,
    BroadcastSuppressionsService,
    BroadcastDispatcher,
    InAppDispatcher,
    EmailDispatcher,
    LineDispatcher,
  ],
  exports: [EmailService, BroadcastsService, BroadcastDispatcher],
})
export class BroadcastsModule {}
