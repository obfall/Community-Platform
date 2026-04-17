import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { NotificationsService } from "@/notifications/notifications.service";
import type { Job } from "bullmq";

interface EventReminderJobData {
  eventId: string;
}

@Processor("event-reminder")
export class EventReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(EventReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<EventReminderJobData>): Promise<void> {
    const { eventId } = job.data;
    this.logger.log(`Processing reminder for event ${eventId}`);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { applicationFormConfig: true },
    });

    if (!event || event.deletedAt || event.status === "canceled") {
      this.logger.log(`Event ${eventId} is deleted or canceled, skipping reminder`);
      return;
    }

    const config = event.applicationFormConfig;
    if (!config?.reminderEnabled) {
      this.logger.log(`Reminder disabled for event ${eventId}, skipping`);
      return;
    }

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId, status: { not: "canceled" } },
      select: { userId: true },
    });

    if (participants.length === 0) {
      this.logger.log(`No active participants for event ${eventId}`);
      return;
    }

    const defaultMessage = `イベント「${event.title}」がまもなく開催されます`;
    const body = config.reminderMessage || defaultMessage;

    await this.notificationsService.createMany(
      participants.map((p) => ({
        userId: p.userId,
        type: "event_reminder",
        title: "イベントリマインダー",
        body,
        referenceType: "event",
        referenceId: eventId,
      })),
    );

    this.logger.log(`Sent reminders to ${participants.length} participants for event ${eventId}`);
  }
}
