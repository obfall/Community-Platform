import { ErrorCode } from "@community-platform/shared";
import { BusinessException } from "@/common/exceptions";
import { ChatService } from "./chat.service";
import { ChatRoomType } from "@prisma/client";

type Jestify<T> = { [K in keyof T]: jest.Mock };

function makeDelegate<T extends string>(): Jestify<Record<T, unknown>> {
  return new Proxy(
    {},
    {
      get: (target: Record<string, jest.Mock>, prop: string) => {
        if (!target[prop]) target[prop] = jest.fn();
        return target[prop];
      },
    },
  ) as Jestify<Record<T, unknown>>;
}

describe("ChatService", () => {
  let prismaMock: {
    chatRoom: Jestify<
      Record<"findMany" | "findUnique" | "findFirst" | "create" | "update", unknown>
    >;
    chatRoomMember: Jestify<
      Record<"findMany" | "findFirst" | "create" | "update" | "delete", unknown>
    >;
    chatMessage: Jestify<Record<"findMany" | "findFirst" | "count" | "create" | "update", unknown>>;
    notification: Jestify<Record<"updateMany", unknown>>;
  };
  let notificationsMock: { create: jest.Mock };
  let i18nMock: { translate: jest.Mock };
  let service: ChatService;

  beforeEach(() => {
    prismaMock = {
      chatRoom: makeDelegate(),
      chatRoomMember: makeDelegate(),
      chatMessage: makeDelegate(),
      notification: makeDelegate(),
    };
    notificationsMock = { create: jest.fn().mockResolvedValue({}) };
    // 翻訳キーをそのまま返すモック（呼び出し検証しやすくするため）
    i18nMock = { translate: jest.fn((key: string) => key) };
    service = new ChatService(prismaMock as never, notificationsMock as never, i18nMock as never);
  });

  // ============================================================================
  // findRooms: ルーム一覧
  // ============================================================================
  describe("findRooms: 自分が所属するルームの一覧", () => {
    it("メンバーシップが無ければ空配列を返す", async () => {
      prismaMock.chatRoomMember.findMany.mockResolvedValue([]);

      const result = await service.findRooms("u-1");

      expect(result).toEqual([]);
      expect(prismaMock.chatRoom.findMany).not.toHaveBeenCalled();
    });

    it("各ルームに lastMessage / unreadCount / 整形済み members を載せる", async () => {
      prismaMock.chatRoomMember.findMany.mockResolvedValue([
        { chatRoomId: "r-1", lastReadAt: new Date("2026-01-01") },
      ]);
      prismaMock.chatRoom.findMany.mockResolvedValue([
        {
          id: "r-1",
          type: "dm",
          name: null,
          description: null,
          iconUrl: null,
          maxMembers: null,
          lastMessageAt: new Date("2026-01-02"),
          createdAt: new Date("2026-01-01"),
          members: [
            {
              id: "m-1",
              user: { id: "u-1", name: "自分", profile: { avatarUrl: null } },
              role: "admin",
              joinedAt: new Date("2026-01-01"),
            },
            {
              id: "m-2",
              user: { id: "u-2", name: "相手", profile: { avatarUrl: "https://x/y.png" } },
              role: "member",
              joinedAt: new Date("2026-01-01"),
            },
          ],
        },
      ]);
      prismaMock.chatMessage.findFirst.mockResolvedValue({
        id: "msg-1",
        body: "hi",
        messageType: "text",
        sender: { id: "u-2", name: "相手", profile: { avatarUrl: null } },
        createdAt: new Date("2026-01-02"),
      });
      prismaMock.chatMessage.count.mockResolvedValue(3);

      const result = await service.findRooms("u-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "r-1",
        memberCount: 2,
        unreadCount: 3,
        lastMessage: { id: "msg-1", body: "hi", senderName: "相手" },
      });
      // unreadCount は lastReadAt より後・自分以外の送信メッセージを数える
      expect(prismaMock.chatMessage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gt: new Date("2026-01-01") },
            senderUserId: { not: "u-1" },
          }),
        }),
      );
    });
  });

  // ============================================================================
  // createRoom: ルーム作成
  // ============================================================================
  describe("createRoom: DM", () => {
    it("memberIds が空配列なら VALIDATION_FAILED", async () => {
      await expect(
        service.createRoom("u-1", {
          type: ChatRoomType.dm,
          memberIds: [],
        } as never),
      ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it("memberIds が 2 件以上なら VALIDATION_FAILED", async () => {
      await expect(
        service.createRoom("u-1", {
          type: ChatRoomType.dm,
          memberIds: ["u-2", "u-3"],
        } as never),
      ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it("既存 DM があればそれを返し、新規作成しない", async () => {
      prismaMock.chatRoom.findFirst.mockResolvedValue({ id: "existing-room" });
      // findRoomById は単独でテスト済なので最低限のスタブ
      prismaMock.chatRoom.findUnique.mockResolvedValue({
        id: "existing-room",
        type: "dm",
        name: null,
        description: null,
        iconUrl: null,
        maxMembers: null,
        lastMessageAt: null,
        createdAt: new Date("2026-01-01"),
        members: [
          {
            id: "m-1",
            userId: "u-1",
            user: { id: "u-1", name: "self", profile: { avatarUrl: null } },
            role: "admin",
            joinedAt: new Date("2026-01-01"),
          },
        ],
      });
      prismaMock.chatMessage.findFirst.mockResolvedValue(null);
      prismaMock.chatMessage.count.mockResolvedValue(0);

      const result = await service.createRoom("u-1", {
        type: ChatRoomType.dm,
        memberIds: ["u-2"],
      } as never);

      expect(result.id).toBe("existing-room");
      expect(prismaMock.chatRoom.create).not.toHaveBeenCalled();
    });

    it("既存 DM が無ければ新規作成する", async () => {
      prismaMock.chatRoom.findFirst.mockResolvedValue(null);
      prismaMock.chatRoom.create.mockResolvedValue({ id: "new-room" });
      // findRoomById のスタブ
      prismaMock.chatRoom.findUnique.mockResolvedValue({
        id: "new-room",
        type: "dm",
        name: null,
        description: null,
        iconUrl: null,
        maxMembers: null,
        lastMessageAt: null,
        createdAt: new Date(),
        members: [
          {
            id: "m-1",
            userId: "u-1",
            user: { id: "u-1", name: "self", profile: { avatarUrl: null } },
            role: "admin",
            joinedAt: new Date(),
          },
        ],
      });
      prismaMock.chatMessage.findFirst.mockResolvedValue(null);
      prismaMock.chatMessage.count.mockResolvedValue(0);

      const result = await service.createRoom("u-1", {
        type: ChatRoomType.dm,
        memberIds: ["u-2"],
      } as never);

      expect(prismaMock.chatRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "dm",
            createdByUserId: null,
            members: {
              create: [
                { userId: "u-1", role: "admin" },
                { userId: "u-2", role: "member" },
              ],
            },
          }),
        }),
      );
      expect(result.id).toBe("new-room");
    });
  });

  describe("createRoom: グループ", () => {
    it("グループは createdByUserId を作成者に設定する", async () => {
      prismaMock.chatRoom.create.mockResolvedValue({ id: "g-1" });
      prismaMock.chatRoom.findUnique.mockResolvedValue({
        id: "g-1",
        type: "group",
        name: "チーム",
        description: null,
        iconUrl: null,
        maxMembers: null,
        lastMessageAt: null,
        createdAt: new Date(),
        members: [
          {
            id: "m-1",
            userId: "u-1",
            user: { id: "u-1", name: "self", profile: { avatarUrl: null } },
            role: "admin",
            joinedAt: new Date(),
          },
        ],
      });
      prismaMock.chatMessage.findFirst.mockResolvedValue(null);
      prismaMock.chatMessage.count.mockResolvedValue(0);

      await service.createRoom("u-1", {
        type: ChatRoomType.group,
        name: "チーム",
        memberIds: ["u-2", "u-3"],
      } as never);

      expect(prismaMock.chatRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "group",
            name: "チーム",
            createdByUserId: "u-1",
          }),
        }),
      );
    });
  });

  // ============================================================================
  // findRoomById
  // ============================================================================
  describe("findRoomById: ルーム詳細", () => {
    it("見つからなければ BusinessException を投げる", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(null);

      await expect(service.findRoomById("missing", "u-1")).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it("見つからない場合の例外は NOT_FOUND コードと messageKey を持つ", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(null);

      await expect(service.findRoomById("missing", "u-1")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.chat_room",
      });
    });

    it("非メンバーが引くと FORBIDDEN", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue({
        id: "r-1",
        type: "group",
        name: "G",
        description: null,
        iconUrl: null,
        maxMembers: null,
        lastMessageAt: null,
        createdAt: new Date(),
        members: [
          {
            id: "m-1",
            userId: "other-user",
            user: { id: "other-user", name: "他", profile: { avatarUrl: null } },
            role: "admin",
            joinedAt: new Date(),
          },
        ],
      });

      await expect(service.findRoomById("r-1", "u-1")).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
        messageKey: "errors.forbidden_resource.chat_room_not_member",
      });
    });
  });

  // ============================================================================
  // updateRoom
  // ============================================================================
  describe("updateRoom: ルーム更新（グループのみ・admin のみ）", () => {
    const baseRoom = {
      id: "r-1",
      type: ChatRoomType.group,
      members: [
        { id: "m-1", userId: "u-1", role: "admin" },
        { id: "m-2", userId: "u-2", role: "member" },
      ],
    };

    it("ルームが見つからなければ NOT_FOUND", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(null);

      await expect(service.updateRoom("missing", "u-1", { name: "x" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.chat_room",
      });
    });

    it("DM ルームは更新できない", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue({ ...baseRoom, type: ChatRoomType.dm });

      await expect(service.updateRoom("r-1", "u-1", { name: "x" })).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
        messageKey: "errors.validation.chat_dm_no_update",
      });
    });

    it("非メンバーは FORBIDDEN", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(baseRoom);

      await expect(service.updateRoom("r-1", "stranger", { name: "x" })).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
        messageKey: "errors.forbidden_resource.chat_room_not_member",
      });
    });

    it("一般メンバーは FORBIDDEN (admin 限定)", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(baseRoom);

      await expect(service.updateRoom("r-1", "u-2", { name: "x" })).rejects.toMatchObject({
        messageKey: "errors.forbidden_resource.chat_room_update_admin",
      });
    });
  });

  // ============================================================================
  // findMessages: readCount 計算
  // ============================================================================
  describe("findMessages: readCount は『送信者以外で lastReadAt >= createdAt』の人数", () => {
    it("送信者本人はカウントから除外、未読の人もカウントしない", async () => {
      const messageCreatedAt = new Date("2026-01-01T10:00:00Z");
      prismaMock.chatRoomMember.findFirst.mockResolvedValue({ id: "m-1", userId: "u-1" });
      prismaMock.chatMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          chatRoomId: "r-1",
          messageType: "text",
          body: "hello",
          fileId: null,
          senderUserId: "u-1",
          sender: { id: "u-1", name: "Sender", profile: { avatarUrl: null } },
          createdAt: messageCreatedAt,
          updatedAt: messageCreatedAt,
        },
      ]);
      prismaMock.chatMessage.count.mockResolvedValue(1);
      prismaMock.chatRoomMember.findMany.mockResolvedValue([
        { userId: "u-1", lastReadAt: new Date("2026-01-01T11:00:00Z") }, // 送信者本人 → 除外
        { userId: "u-2", lastReadAt: new Date("2026-01-01T11:00:00Z") }, // 既読
        { userId: "u-3", lastReadAt: new Date("2026-01-01T09:00:00Z") }, // 未読
        { userId: "u-4", lastReadAt: null }, // 未読（読んだことがない）
      ]);

      const result = await service.findMessages("r-1", "u-1", {} as never);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.readCount).toBe(1);
    });

    it("非メンバーは FORBIDDEN を投げる", async () => {
      prismaMock.chatRoomMember.findFirst.mockResolvedValue(null);

      await expect(service.findMessages("r-1", "stranger", {} as never)).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });
  });

  // ============================================================================
  // createMessage
  // ============================================================================
  describe("createMessage: メッセージ送信", () => {
    it("メッセージを作成し、ミュートしていない他メンバーに通知を作る", async () => {
      prismaMock.chatRoomMember.findFirst.mockResolvedValue({ id: "m-1", userId: "u-1" });
      const createdAt = new Date("2026-01-02");
      prismaMock.chatMessage.create.mockResolvedValue({
        id: "msg-1",
        chatRoomId: "r-1",
        messageType: "text",
        body: "hi",
        fileId: null,
        senderUserId: "u-1",
        sender: { id: "u-1", name: "Self", profile: { avatarUrl: null } },
        createdAt,
        updatedAt: createdAt,
      });
      prismaMock.chatRoom.findUnique.mockResolvedValue({
        type: "group",
        name: "G",
        members: [
          { userId: "u-1", isMuted: false }, // 送信者 → 除外
          { userId: "u-2", isMuted: false }, // 通知対象
          { userId: "u-3", isMuted: true }, // ミュート → 除外
        ],
      });
      prismaMock.chatRoom.update.mockResolvedValue({});

      const result = await service.createMessage("r-1", "u-1", "hi");

      expect(result).toMatchObject({ id: "msg-1", body: "hi", readCount: 0 });
      // lastMessageAt の更新
      expect(prismaMock.chatRoom.update).toHaveBeenCalledWith({
        where: { id: "r-1" },
        data: { lastMessageAt: createdAt },
      });
      // 通知作成は非同期だが test では await されていないので少し待つ
      await new Promise((r) => setImmediate(r));
      expect(notificationsMock.create).toHaveBeenCalledTimes(1);
      expect(notificationsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u-2",
          referenceId: "r-1",
          // 翻訳キーがそのまま title に入っていることを検証（i18n モックはキーを返す）
          title: "notifications.chat_new_message",
        }),
      );
      expect(i18nMock.translate).toHaveBeenCalledWith("notifications.chat_new_message", {
        lang: "ja",
      });
    });

    it("非メンバーは FORBIDDEN", async () => {
      prismaMock.chatRoomMember.findFirst.mockResolvedValue(null);

      await expect(service.createMessage("r-1", "stranger", "hi")).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });
  });

  // ============================================================================
  // addMember
  // ============================================================================
  describe("addMember: メンバー追加（グループ・admin のみ）", () => {
    const baseGroup = {
      id: "r-1",
      type: ChatRoomType.group,
      maxMembers: null,
      members: [
        { id: "m-1", userId: "u-1", role: "admin" },
        { id: "m-2", userId: "u-2", role: "member" },
      ],
    };

    it("ルームが見つからなければ NOT_FOUND", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(null);

      await expect(service.addMember("missing", "u-1", "u-3")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.chat_room",
      });
    });

    it("DM には追加できない", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue({ ...baseGroup, type: ChatRoomType.dm });

      await expect(service.addMember("r-1", "u-1", "u-3")).rejects.toMatchObject({
        messageKey: "errors.validation.chat_dm_no_member_add",
      });
    });

    it("admin 以外は追加できない", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(baseGroup);

      await expect(service.addMember("r-1", "u-2", "u-3")).rejects.toMatchObject({
        messageKey: "errors.forbidden_resource.chat_room_add_member_admin",
      });
    });

    it("既にメンバーなら拒否", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(baseGroup);

      await expect(service.addMember("r-1", "u-1", "u-2")).rejects.toMatchObject({
        messageKey: "errors.validation.chat_room_member_exists",
      });
    });

    it("maxMembers 上限超えは拒否", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue({ ...baseGroup, maxMembers: 2 });

      await expect(service.addMember("r-1", "u-1", "u-3")).rejects.toMatchObject({
        messageKey: "errors.validation.chat_room_max_members",
      });
    });

    it("成功時は chatRoomMember.create を呼ぶ", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValueOnce(baseGroup).mockResolvedValueOnce({
        ...baseGroup,
        name: "G",
        description: null,
        iconUrl: null,
        lastMessageAt: null,
        createdAt: new Date(),
        members: [...baseGroup.members, { id: "m-3", userId: "u-3", role: "member" }].map((m) => ({
          ...m,
          user: { id: m.userId, name: m.userId, profile: { avatarUrl: null } },
          joinedAt: new Date(),
        })),
      });
      prismaMock.chatRoomMember.create.mockResolvedValue({});
      prismaMock.chatMessage.findFirst.mockResolvedValue(null);
      prismaMock.chatMessage.count.mockResolvedValue(0);

      await service.addMember("r-1", "u-1", "u-3");

      expect(prismaMock.chatRoomMember.create).toHaveBeenCalledWith({
        data: { chatRoomId: "r-1", userId: "u-3", role: "member" },
      });
    });
  });

  // ============================================================================
  // removeMember
  // ============================================================================
  describe("removeMember: メンバー削除", () => {
    const baseGroup = {
      id: "r-1",
      type: ChatRoomType.group,
      members: [
        { id: "m-1", userId: "u-1", role: "admin" },
        { id: "m-2", userId: "u-2", role: "member" },
        { id: "m-3", userId: "u-3", role: "member" },
      ],
    };

    it("ルームが見つからなければ NOT_FOUND", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(null);

      await expect(service.removeMember("missing", "u-1", "u-2")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.chat_room",
      });
    });

    it("DM からは削除できない", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue({ ...baseGroup, type: ChatRoomType.dm });

      await expect(service.removeMember("r-1", "u-1", "u-2")).rejects.toMatchObject({
        messageKey: "errors.validation.chat_dm_no_member_remove",
      });
    });

    it("自分自身は退出できる（admin でなくとも）", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(baseGroup);
      prismaMock.chatRoomMember.delete.mockResolvedValue({});

      await service.removeMember("r-1", "u-2", "u-2");

      expect(prismaMock.chatRoomMember.delete).toHaveBeenCalledWith({ where: { id: "m-2" } });
    });

    it("admin は他人を削除できる", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(baseGroup);
      prismaMock.chatRoomMember.delete.mockResolvedValue({});

      await service.removeMember("r-1", "u-1", "u-2");

      expect(prismaMock.chatRoomMember.delete).toHaveBeenCalledWith({ where: { id: "m-2" } });
    });

    it("一般メンバーが他人を削除しようとすると FORBIDDEN", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(baseGroup);

      await expect(service.removeMember("r-1", "u-2", "u-3")).rejects.toMatchObject({
        messageKey: "errors.forbidden_resource.chat_room_remove_member_admin",
      });
    });

    it("対象がメンバーでなければ拒否", async () => {
      prismaMock.chatRoom.findUnique.mockResolvedValue(baseGroup);

      await expect(service.removeMember("r-1", "u-1", "stranger")).rejects.toMatchObject({
        messageKey: "errors.validation.chat_room_target_not_member",
      });
    });
  });

  // ============================================================================
  // markAsRead
  // ============================================================================
  describe("markAsRead: 既読更新", () => {
    it("非メンバーは FORBIDDEN", async () => {
      prismaMock.chatRoomMember.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead("r-1", "stranger")).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });

    it("lastReadAt 更新と関連通知の既読更新を行う", async () => {
      prismaMock.chatRoomMember.findFirst.mockResolvedValue({ id: "m-1" });
      prismaMock.chatRoomMember.update.mockResolvedValue({});
      prismaMock.notification.updateMany.mockResolvedValue({ count: 2 });

      await service.markAsRead("r-1", "u-1");

      expect(prismaMock.chatRoomMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "m-1" },
          data: expect.objectContaining({ lastReadAt: expect.any(Date) }),
        }),
      );
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "u-1",
            referenceType: "chat_room",
            referenceId: "r-1",
            isRead: false,
          }),
          data: expect.objectContaining({ isRead: true }),
        }),
      );
    });
  });

  // ============================================================================
  // toggleMute
  // ============================================================================
  describe("toggleMute: ミュート切替", () => {
    it("非メンバーは FORBIDDEN", async () => {
      prismaMock.chatRoomMember.findFirst.mockResolvedValue(null);

      await expect(service.toggleMute("r-1", "stranger")).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });

    it("isMuted が反転して返る", async () => {
      prismaMock.chatRoomMember.findFirst.mockResolvedValue({ id: "m-1", isMuted: false });
      prismaMock.chatRoomMember.update.mockResolvedValue({ isMuted: true });

      const result = await service.toggleMute("r-1", "u-1");

      expect(result).toEqual({ isMuted: true });
      expect(prismaMock.chatRoomMember.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: { isMuted: true },
      });
    });
  });
});
