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
import { Server, Socket } from "socket.io";
import { PrismaService } from "@/prisma/prisma.service";
import { ChatService } from "./chat.service";
import type { JwtPayload } from "@/auth/types/jwt-payload";

type AuthenticatedSocket = Socket & {
  data: { userId: string; userName: string };
};

@WebSocketGateway({
  namespace: "/chat",
  cors: { origin: "*" },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

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
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("chat:join")
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const { userId } = client.data;

    // メンバーかどうか確認
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { chatRoomId: data.roomId, userId },
    });

    if (!membership) {
      client.emit("chat:error", { message: "このルームのメンバーではありません" });
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
    const { userId } = client.data;

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
      const errorMessage = error instanceof Error ? error.message : "メッセージ送信に失敗しました";
      client.emit("chat:error", { message: errorMessage });
    }
  }

  @SubscribeMessage("chat:typing")
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const { userId, userName } = client.data;

    // 送信者以外にブロードキャスト
    client.to(`room:${data.roomId}`).emit("chat:typing", {
      roomId: data.roomId,
      userId,
      userName,
    });
  }
}
