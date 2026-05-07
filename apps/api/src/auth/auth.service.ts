import {
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { ErrorCode } from "@community-platform/shared";
import { PrismaService } from "@/prisma/prisma.service";
import { EmailService } from "@/broadcasts/email.service";
import { AnalyticsService } from "@/analytics/analytics.service";
import { BusinessException } from "@/common/exceptions";
import { LoginAttemptService } from "./services";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RefreshTokenDto } from "./dto/refresh-token.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { JwtPayload } from "./types/jwt-payload";

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly analytics: AnalyticsService,
    private readonly loginAttempt: LoginAttemptService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("このメールアドレスは既に登録されています");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        profile: { create: {} },
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, user };
  }

  async login(dto: LoginDto, ip: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      await this.recordLoginHistory(user?.id, userAgent, "failure", "invalid_credentials");
      throw new UnauthorizedException("メールアドレスまたはパスワードが正しくありません");
    }

    // 5 回失敗で 15 分ロック（複数 IP からの分散攻撃対策）
    if (await this.loginAttempt.isLocked(user.id)) {
      const remaining = await this.loginAttempt.getRemainingLockSeconds(user.id);
      const minutes = Math.ceil(remaining / 60);
      await this.recordLoginHistory(user.id, userAgent, "failure", "account_locked");
      throw new BusinessException(
        ErrorCode.AUTH_ACCOUNT_LOCKED,
        HttpStatus.TOO_MANY_REQUESTS,
        `ログイン試行が上限を超えました。${minutes} 分後に再試行してください`,
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.recordLoginHistory(user.id, userAgent, "failure", "invalid_credentials");
      throw new UnauthorizedException("メールアドレスまたはパスワードが正しくありません");
    }

    if (user.status !== "active") {
      await this.recordLoginHistory(user.id, userAgent, "failure", "account_inactive");
      throw new UnauthorizedException("アカウントが無効です");
    }

    await this.recordLoginHistory(user.id, userAgent, "success");
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.safeLogActivity(user.id, "login");

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken, ip, userAgent);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException("リフレッシュトークンが無効です");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });
    if (!user || user.status !== "active" || user.deletedAt) {
      throw new UnauthorizedException("リフレッシュトークンが無効です");
    }

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.safeLogActivity(userId, "logout");
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Always return success to prevent email enumeration
    if (!user || user.deletedAt) return;

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    this.emailService.sendPasswordResetEmail(user.email, token);
  }

  /**
   * 管理者による強制パスワードリセット発行。
   * 既存の未使用トークンを無効化し、新規トークンを発行してメール送信する。
   */
  async issuePasswordResetForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!user) return;

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);

    await this.prisma.$transaction([
      // 既存の未使用トークンを使用済みにして失効
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);

    this.emailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException("リセットトークンが無効または期限切れです");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens for security
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new UnauthorizedException();

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException("現在のパスワードが正しくありません");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        preferredLocale: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  // --- Private helpers ---

  private async generateTokens(userId: string, email: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = crypto.randomBytes(32).toString("hex");
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    rawToken: string,
    ip?: string,
    userAgent?: string,
  ) {
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = this.calcRefreshExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: ip,
        deviceInfo: userAgent?.substring(0, 255),
      },
    });
  }

  private calcRefreshExpiry(): Date {
    const expStr = this.configService.get<string>("JWT_REFRESH_EXPIRATION") ?? "7d";
    const match = expStr.match(/^(\d+)([dhms])$/);
    const now = Date.now();
    if (match && match[1] && match[2]) {
      const value = parseInt(match[1]);
      const unit = match[2];
      const ms: Record<string, number> = {
        d: 86_400_000,
        h: 3_600_000,
        m: 60_000,
        s: 1_000,
      };
      return new Date(now + value * (ms[unit] ?? 86_400_000));
    }
    return new Date(now + 7 * 86_400_000);
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private async recordLoginHistory(
    userId: string | undefined,
    userAgent: string | undefined,
    status: "success" | "failure",
    failureReason?: string,
  ) {
    if (!userId) return;
    await this.prisma.loginHistory.create({
      data: { userId, userAgent, status, failureReason },
    });
  }

  private async safeLogActivity(userId: string, action: string) {
    try {
      await this.analytics.logActivity(userId, action);
    } catch (err) {
      // 監査ログの失敗で認証フローを壊さない
      this.logger.warn(`Failed to log activity (${action}): ${String(err)}`);
    }
  }
}
