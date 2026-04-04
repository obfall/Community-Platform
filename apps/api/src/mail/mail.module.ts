import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { MailController } from "./mail.controller";
import { MailMessagesService } from "./mail-messages.service";
import { MailTemplatesService } from "./mail-templates.service";
import { MailSuppressionsService } from "./mail-suppressions.service";

@Module({
  controllers: [MailController],
  providers: [MailService, MailMessagesService, MailTemplatesService, MailSuppressionsService],
  exports: [MailService, MailMessagesService],
})
export class MailModule {}
