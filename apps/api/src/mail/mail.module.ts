import { Module } from "@nestjs/common";
import { MailController } from "./mail.controller";
import { MailMessagesService } from "./mail-messages.service";
import { MailTemplatesService } from "./mail-templates.service";
import { MailSuppressionsService } from "./mail-suppressions.service";

@Module({
  controllers: [MailController],
  providers: [MailMessagesService, MailTemplatesService, MailSuppressionsService],
  exports: [MailMessagesService],
})
export class MailModule {}
