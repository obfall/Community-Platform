import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { I18nService } from "nestjs-i18n";
import { Server, Socket } from "socket.io";
import { PrismaService } from "@/prisma/prisma.service";
import { BusinessException } from "@/common/exceptions";
import { ChatService } from "./chat.service";
import { WsRateLimiter } from "./ws-rate-limiter";
import type { JwtPayload } from "@/auth/types/jwt-payload";

type AuthenticatedSocket = Socket & {
  data: { userId: string; userName: string };
};

// CORS_ORIGIN をカンマ区切りで分割（main.ts と同じパターン）。
// 単一なら文字列で、複数なら配列で WebSocket Gateway に渡す。
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

@WebSocketGateway({
  namespace: "/chat",
  cors: {
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly rateLimiter = new WsRateLimiter(30, 60_000);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly i18n: I18nService,
  ) {}

  /** WebSocket は HTTP リクエストの locale を取れないので ja 固定で翻訳する（MVP は ja 単独運用） */
  private t(key: string): string {
    const translated = this.i18n.translate(key, { lang: "ja" });
    return typeof translated === "string" ? translated : key;
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) throw new UnauthorizedException();

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
      });

      // ユーザー検証
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, status: true, deletedAt: true },
      });

      if (!user || user.status !== "active" || user.deletedAt) {
        throw new UnauthorizedException();
      }

      client.data = { userId: user.id, userName: user.name };
      this.logger.log(`Client connected: ${user.name} (${client.id})`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.rateLimiter.cleanup(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** 認証済みか確認し、userId を返す。未認証なら null */
  private assertAuth(client: AuthenticatedSocket): string | null {
    const userId: string | undefined = (client.data as { userId?: string })?.userId;
    if (!userId) {
      client.emit("chat:error", { message: this.t("errors.ws.chat_unauthenticated") });
      return null;
    }
    return userId;
  }

  @SubscribeMessage("chat:join")
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = this.assertAuth(client);
    if (!userId) return;

    // メンバーかどうか確認
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { chatRoomId: data.roomId, userId },
    });

    if (!membership) {
      client.emit("chat:error", { message: this.t("errors.ws.chat_not_member") });
      return;
    }

    await client.join(`room:${data.roomId}`);
    this.logger.log(`User ${userId} joined room ${data.roomId}`);
  }

  @SubscribeMessage("chat:message")
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      roomId: string;
      body: string;
      messageType?: "text" | "image" | "file";
      fileId?: string;
    },
  ) {
    const userId = this.assertAuth(client);
    if (!userId) return;

    if (!this.rateLimiter.check(client.id)) {
      client.emit("chat:rate-limit", {
        message: this.t("errors.ws.chat_rate_limit"),
      });
      return;
    }

    try {
      const message = await this.chatService.createMessage(
        data.roomId,
        userId,
        data.body,
        data.messageType ?? "text",
        data.fileId,
      );

      // ルーム内の全メンバーにブロードキャスト
      this.server.to(`room:${data.roomId}`).emit("chat:message", message);
    } catch (error) {
      // BusinessException は messageKey を持つので i18n で翻訳して返す。
      // それ以外（Prisma エラー等の内部例外）は内部メッセージを露出させず汎用文言にする。
      // 詳細は logger / Sentry でサーバー側で追跡する。
      if (!(error instanceof BusinessException)) {
        this.logger.error("chat:message failed", error as Error);
      }
      const errorMessage =
        error instanceof BusinessException && error.messageKey
          ? this.t(error.messageKey)
          : this.t("errors.ws.chat_message_failed");
      client.emit("chat:error", { message: errorMessage });
    }
  }

  @SubscribeMessage("chat:read")
  handleRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = this.assertAuth(client);
    if (!userId) return;

    // 送信者以外にブロードキャスト（既読表示の更新用）
    // 既読のDB更新はREST API側で行うため、ここではブロードキャストのみ
    client.to(`room:${data.roomId}`).emit("chat:read", {
      roomId: data.roomId,
      userId,
    });
  }

  @SubscribeMessage("chat:typing")
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = this.assertAuth(client);
    if (!userId) return;
    const { userName } = client.data;

    // 送信者以外にブロードキャスト
    client.to(`room:${data.roomId}`).emit("chat:typing", {
      roomId: data.roomId,
      userId,
      userName,
    });
  }
}
