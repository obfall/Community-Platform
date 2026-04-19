import { Injectable, Logger } from "@nestjs/common";

/**
 * 単発メール送信プリミティブ（トランザクショナルメール用）。
 * Resend SDK 統合は Phase 4 で実施予定。
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  sendPasswordResetEmail(email: string, token: string): void {
    // TODO: Replace with Resend integration
    this.logger.log(`[MOCK] Password reset email to: ${email}`);
    this.logger.log(`[MOCK] Reset token: ${token}`);
  }
}
