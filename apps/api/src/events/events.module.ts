import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { NotificationsModule } from "@/notifications/notifications.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { ApplicationFormController } from "./application-form.controller";
import { ApplicationFormService } from "./application-form.service";
import { EventResultsController } from "./event-results.controller";
import { EventResultsService } from "./event-results.service";
import { EventReminderProcessor } from "./event-reminder.processor";

const redisEnabled = !!process.env.REDIS_HOST;

@Module({
  imports: [
    NotificationsModule,
    ...(redisEnabled ? [BullModule.registerQueue({ name: "event-reminder" })] : []),
  ],
  controllers: [EventsController, ApplicationFormController, EventResultsController],
  providers: [
    EventsService,
    ApplicationFormService,
    EventResultsService,
    ...(redisEnabled ? [EventReminderProcessor] : []),
  ],
  exports: [EventsService],
})
export class EventsModule {}
