import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
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

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

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
        throw new BadRequestException("DMは相手1人のみ指定してください");
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

    if (!room) throw new NotFoundException("ルームが見つかりません");

    const isMember = room.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException("このルームのメンバーではありません");

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
    if (!room) throw new NotFoundException("ルームが見つかりません");
    if (room.type !== ChatRoomType.group) {
      throw new BadRequestException("DMルームは更新できません");
    }

    const member = room.members.find((m) => m.userId === userId);
    if (!member) throw new ForbiddenException("このルームのメンバーではありません");
    if (member.role !== "admin") throw new ForbiddenException("管理者のみ更新できます");

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

    const [messages, total] = await Promise.all([
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
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: messages.map((m) => ({
        id: m.id,
        chatRoomId: m.chatRoomId,
        messageType: m.messageType,
        body: m.body,
        fileId: m.fileId,
        sender: mapMemberUser(m.sender),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
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

    const message = await this.prisma.chatMessage.create({
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
    });

    // lastMessageAt を更新
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: message.createdAt },
    });

    return {
      id: message.id,
      chatRoomId: message.chatRoomId,
      messageType: message.messageType,
      body: message.body,
      fileId: message.fileId,
      sender: mapMemberUser(message.sender),
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
    if (!room) throw new NotFoundException("ルームが見つかりません");
    if (room.type !== ChatRoomType.group) {
      throw new BadRequestException("DMルームにメンバーは追加できません");
    }

    const member = room.members.find((m) => m.userId === userId);
    if (!member) throw new ForbiddenException("このルームのメンバーではありません");
    if (member.role !== "admin") throw new ForbiddenException("管理者のみメンバーを追加できます");

    if (room.maxMembers && room.members.length >= room.maxMembers) {
      throw new BadRequestException("メンバー数の上限に達しています");
    }

    const already = room.members.find((m) => m.userId === targetUserId);
    if (already) throw new BadRequestException("既にメンバーです");

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
    if (!room) throw new NotFoundException("ルームが見つかりません");
    if (room.type !== ChatRoomType.group) {
      throw new BadRequestException("DMルームからメンバーは削除できません");
    }

    const member = room.members.find((m) => m.userId === userId);
    if (!member) throw new ForbiddenException("このルームのメンバーではありません");

    // 自分自身の退出、または管理者による削除
    if (userId !== targetUserId && member.role !== "admin") {
      throw new ForbiddenException("管理者のみ他のメンバーを削除できます");
    }

    const target = room.members.find((m) => m.userId === targetUserId);
    if (!target) throw new BadRequestException("対象ユーザーはメンバーではありません");

    await this.prisma.chatRoomMember.delete({ where: { id: target.id } });
  }

  /** 既読更新 */
  async markAsRead(roomId: string, userId: string) {
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { chatRoomId: roomId, userId },
    });
    if (!membership) throw new ForbiddenException("このルームのメンバーではありません");

    await this.prisma.chatRoomMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });
  }

  /** ミュート切替 */
  async toggleMute(roomId: string, userId: string) {
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { chatRoomId: roomId, userId },
    });
    if (!membership) throw new ForbiddenException("このルームのメンバーではありません");

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
    if (!membership) throw new ForbiddenException("このルームのメンバーではありません");
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
