import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendPasswordResetEmail(email: string, token: string): void {
    // TODO: Replace with Resend integration
    this.logger.log(`[MOCK] Password reset email to: ${email}`);
    this.logger.log(`[MOCK] Reset token: ${token}`);
  }
}
