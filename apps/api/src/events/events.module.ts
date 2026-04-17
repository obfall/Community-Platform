import { Module } from "@nestjs/common";
import { NotificationsModule } from "@/notifications/notifications.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { ApplicationFormController } from "./application-form.controller";
import { ApplicationFormService } from "./application-form.service";
import { EventResultsController } from "./event-results.controller";
import { EventResultsService } from "./event-results.service";

@Module({
  imports: [NotificationsModule],
  controllers: [EventsController, ApplicationFormController, EventResultsController],
  providers: [EventsService, ApplicationFormService, EventResultsService],
  exports: [EventsService],
})
export class EventsModule {}
