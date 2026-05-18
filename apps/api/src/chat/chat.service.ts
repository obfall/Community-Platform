import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { ErrorCode } from "@community-platform/shared";
import { PrismaService } from "@/prisma/prisma.service";
import { NotificationsService } from "@/notifications/notifications.service";
import { BusinessException } from "@/common/exceptions";
import errorMessages from "@/i18n/messages/ja/errors.json";
import { ChatRoomType } from "@prisma/client";
import type { CreateRoomDto } from "./dto/create-room.dto";
import type { UpdateRoomDto } from "./dto/update-room.dto";
import type { MessageQueryDto } from "./dto/message-query.dto";

const MEMBER_USER_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

function mapMemberUser(user: {
  id: string;
  name: string;
  profile?: { avatarUrl: string | null } | null;
}) {
  return { id: user.id, name: user.name, avatarUrl: user.profile?.avatarUrl ?? null };
}

function notFoundRoom() {
  return new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    errorMessages.not_found.chat_room,
    undefined,
    "errors.not_found.chat_room",
  );
}

function forbidden(resourceKey: keyof typeof errorMessages.forbidden_resource) {
  return new BusinessException(
    ErrorCode.FORBIDDEN,
    HttpStatus.FORBIDDEN,
    errorMessages.forbidden_resource[resourceKey],
    undefined,
    `errors.forbidden_resource.${resourceKey}`,
  );
}

function badRequest(validationKey: keyof typeof errorMessages.validation) {
  return new BusinessException(
    ErrorCode.VALIDATION_FAILED,
    HttpStatus.BAD_REQUEST,
    errorMessages.validation[validationKey],
    undefined,
    `errors.validation.${validationKey}`,
  );
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  /** 通知 title は保存時点で文字列確定する必要があるため ja 固定で翻訳する（MVP は ja 単独運用） */
  private translateNotificationTitle(key: string): string {
    const result = this.i18n.translate(key, { lang: "ja" });
    return typeof result === "string" ? result : key;
  }

  /** ルーム一覧（自分が所属するルームのみ） */
  async findRooms(userId: string) {
    const memberships = await this.prisma.chatRoomMember.findMany({
      where: { userId },
      select: { chatRoomId: true, lastReadAt: true },
    });

    if (memberships.length === 0) return [];

    const roomIds = memberships.map((m) => m.chatRoomId);
    const lastReadMap = new Map(memberships.map((m) => [m.chatRoomId, m.lastReadAt]));

    const rooms = await this.prisma.chatRoom.findMany({
      where: { id: { in: roomIds } },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      include: {
        members: {
          include: { user: { select: MEMBER_USER_SELECT } },
        },
      },
    });

    // 各ルームの最新メッセージと未読数を取得
    const roomData = await Promise.all(
      rooms.map(async (room) => {
        const lastReadAt = lastReadMap.get(room.id);

        const [lastMessage, unreadCount] = await Promise.all([
          this.prisma.chatMessage.findFirst({
            where: { chatRoomId: room.id, deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: { sender: { select: MEMBER_USER_SELECT } },
          }),
          lastReadAt
            ? this.prisma.chatMessage.count({
                where: {
                  chatRoomId: room.id,
                  deletedAt: null,
                  createdAt: { gt: lastReadAt },
                  senderUserId: { not: userId },
                },
              })
            : this.prisma.chatMessage.count({
                where: {
                  chatRoomId: room.id,
                  deletedAt: null,
                  senderUserId: { not: userId },
                },
              }),
        ]);

        return {
          id: room.id,
          type: room.type,
          name: room.name,
          description: room.description,
          iconUrl: room.iconUrl,
          maxMembers: room.maxMembers,
          lastMessageAt: room.lastMessageAt,
          memberCount: room.members.length,
          unreadCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                body: lastMessage.body,
                messageType: lastMessage.messageType,
                senderName: lastMessage.sender.name,
                createdAt: lastMessage.createdAt,
              }
            : null,
          members: room.members.map((m) => ({
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            avatarUrl: m.user.profile?.avatarUrl ?? null,
            role: m.role,
            joinedAt: m.joinedAt,
          })),
          createdAt: room.createdAt,
        };
      }),
    );

    return roomData;
  }

  /** ルーム作成 */
  async createRoom(userId: string, dto: CreateRoomDto) {
    if (dto.type === ChatRoomType.dm) {
      if (dto.memberIds.length !== 1 || !dto.memberIds[0]) {
        throw badRequest("chat_dm_member_count");
      }
      // 既存DMがあればそれを返す
      const targetUserId: string = dto.memberIds[0];
      const existing = await this.findExistingDm(userId, targetUserId);
      if (existing) return this.findRoomById(existing.id, userId);
    }

    const room = await this.prisma.chatRoom.create({
      data: {
        type: dto.type,
        name: dto.name,
        description: dto.description,
        createdByUserId: dto.type === ChatRoomType.group ? userId : null,
        members: {
          create: [
            { userId, role: "admin" },
            ...dto.memberIds.map((id) => ({ userId: id, role: "member" as const })),
          ],
        },
      },
    });

    return this.findRoomById(room.id, userId);
  }

  /** ルーム詳細 */
  async findRoomById(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: MEMBER_USER_SELECT } },
        },
      },
    });

    if (!room) throw notFoundRoom();

    const isMember = room.members.some((m) => m.userId === userId);
    if (!isMember) throw forbidden("chat_room_not_member");

    const membership = room.members.find((m) => m.userId === userId);
    const lastReadAt = membership?.lastReadAt;

    const [lastMessage, unreadCount] = await Promise.all([
      this.prisma.chatMessage.findFirst({
        where: { chatRoomId: room.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { sender: { select: MEMBER_USER_SELECT } },
      }),
      lastReadAt
        ? this.prisma.chatMessage.count({
            where: {
              chatRoomId: room.id,
              deletedAt: null,
              createdAt: { gt: lastReadAt },
              senderUserId: { not: userId },
            },
          })
        : this.prisma.chatMessage.count({
            where: {
              chatRoomId: room.id,
              deletedAt: null,
              senderUserId: { not: userId },
            },
          }),
    ]);

    return {
      id: room.id,
      type: room.type,
      name: room.name,
      description: room.description,
      iconUrl: room.iconUrl,
      maxMembers: room.maxMembers,
      lastMessageAt: room.lastMessageAt,
      memberCount: room.members.length,
      unreadCount,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            body: lastMessage.body,
            messageType: lastMessage.messageType,
            senderName: lastMessage.sender.name,
            createdAt: lastMessage.createdAt,
          }
        : null,
      members: room.members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.profile?.avatarUrl ?? null,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      createdAt: room.createdAt,
    };
  }

  /** ルーム更新（グループのみ） */
  async updateRoom(roomId: string, userId: string, dto: UpdateRoomDto) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { members: true },
    });
    if (!room) throw notFoundRoom();
    if (room.type !== ChatRoomType.group) {
      throw badRequest("chat_dm_no_update");
    }

    const member = room.members.find((m) => m.userId === userId);
    if (!member) throw forbidden("chat_room_not_member");
    if (member.role !== "admin") throw forbidden("chat_room_update_admin");

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return this.findRoomById(roomId, userId);
  }

  /** メッセージ一覧（ページネーション） */
  async findMessages(roomId: string, userId: string, query: MessageQueryDto) {
    await this.assertMembership(roomId, userId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [messages, total, members] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { chatRoomId: roomId, deletedAt: null },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          sender: { select: MEMBER_USER_SELECT },
        },
      }),
      this.prisma.chatMessage.count({
        where: { chatRoomId: roomId, deletedAt: null },
      }),
      this.prisma.chatRoomMember.findMany({
        where: { chatRoomId: roomId },
        select: { userId: true, lastReadAt: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: messages.map((m) => {
        // 送信者以外のメンバーで、lastReadAt >= message.createdAt の人数
        const readCount = members.filter(
          (member) =>
            member.userId !== m.senderUserId &&
            member.lastReadAt &&
            member.lastReadAt >= m.createdAt,
        ).length;

        return {
          id: m.id,
          chatRoomId: m.chatRoomId,
          messageType: m.messageType,
          body: m.body,
          fileId: m.fileId,
          sender: mapMemberUser(m.sender),
          readCount,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** メッセージ送信 */
  async createMessage(
    roomId: string,
    userId: string,
    body: string,
    messageType: "text" | "image" | "file" = "text",
    fileId?: string,
  ) {
    await this.assertMembership(roomId, userId);

    const [message, room] = await Promise.all([
      this.prisma.chatMessage.create({
        data: {
          chatRoomId: roomId,
          senderUserId: userId,
          messageType,
          body,
          fileId,
        },
        include: {
          sender: { select: MEMBER_USER_SELECT },
        },
      }),
      this.prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: {
          type: true,
          name: true,
          members: { select: { userId: true, isMuted: true } },
        },
      }),
    ]);

    // lastMessageAt を更新
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: message.createdAt },
    });

    // 送信者以外・ミュートしていないメンバーに通知を作成（非同期・メッセージ送信をブロックしない）
    if (room) {
      const recipients = room.members.filter((m) => m.userId !== userId && !m.isMuted);

      const title = this.translateNotificationTitle("notifications.chat_new_message");
      Promise.all(
        recipients.map((m) =>
          this.notificationsService.create({
            userId: m.userId,
            type: "chat_message",
            title,
            referenceType: "chat_room",
            referenceId: roomId,
            actorUserId: userId,
          }),
        ),
      ).catch((err) => {
        this.logger.error("チャット通知の作成に失敗しました", err);
      });
    }

    return {
      id: message.id,
      chatRoomId: message.chatRoomId,
      messageType: message.messageType,
      body: message.body,
      fileId: message.fileId,
      sender: mapMemberUser(message.sender),
      readCount: 0,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /** メンバー追加（グループのみ） */
  async addMember(roomId: string, userId: string, targetUserId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { members: true },
    });
    if (!room) throw notFoundRoom();
    if (room.type !== ChatRoomType.group) {
      throw badRequest("chat_dm_no_member_add");
    }

    const member = room.members.find((m) => m.userId === userId);
    if (!member) throw forbidden("chat_room_not_member");
    if (member.role !== "admin") throw forbidden("chat_room_add_member_admin");

    if (room.maxMembers && room.members.length >= room.maxMembers) {
      throw badRequest("chat_room_max_members");
    }

    const already = room.members.find((m) => m.userId === targetUserId);
    if (already) throw badRequest("chat_room_member_exists");

    await this.prisma.chatRoomMember.create({
      data: { chatRoomId: roomId, userId: targetUserId, role: "member" },
    });

    return this.findRoomById(roomId, userId);
  }

  /** メンバー削除 */
  async removeMember(roomId: string, userId: string, targetUserId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { members: true },
    });
    if (!room) throw notFoundRoom();
    if (room.type !== ChatRoomType.group) {
      throw badRequest("chat_dm_no_member_remove");
    }

    const member = room.members.find((m) => m.userId === userId);
    if (!member) throw forbidden("chat_room_not_member");

    // 自分自身の退出、または管理者による削除
    if (userId !== targetUserId && member.role !== "admin") {
      throw forbidden("chat_room_remove_member_admin");
    }

    const target = room.members.find((m) => m.userId === targetUserId);
    if (!target) throw badRequest("chat_room_target_not_member");

    await this.prisma.chatRoomMember.delete({ where: { id: target.id } });
  }

  /** 既読更新 */
  async markAsRead(roomId: string, userId: string) {
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { chatRoomId: roomId, userId },
    });
    if (!membership) throw forbidden("chat_room_not_member");

    const now = new Date();
    await Promise.all([
      this.prisma.chatRoomMember.update({
        where: { id: membership.id },
        data: { lastReadAt: now },
      }),
      // このルームに紐づく未読通知も一括既読にする
      this.prisma.notification.updateMany({
        where: {
          userId,
          referenceType: "chat_room",
          referenceId: roomId,
          isRead: false,
        },
        data: { isRead: true, readAt: now },
      }),
    ]);
  }

  /** ミュート切替 */
  async toggleMute(roomId: string, userId: string) {
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { chatRoomId: roomId, userId },
    });
    if (!membership) throw forbidden("chat_room_not_member");

    const updated = await this.prisma.chatRoomMember.update({
      where: { id: membership.id },
      data: { isMuted: !membership.isMuted },
    });

    return { isMuted: updated.isMuted };
  }

  // --- Private helpers ---

  private async assertMembership(roomId: string, userId: string) {
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { chatRoomId: roomId, userId },
    });
    if (!membership) throw forbidden("chat_room_not_member");
    return membership;
  }

  private async findExistingDm(userA: string, userB: string) {
    // 両方のユーザーが所属するDMルームを検索
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        type: ChatRoomType.dm,
        AND: [{ members: { some: { userId: userA } } }, { members: { some: { userId: userB } } }],
      },
    });
    return room;
  }
}
