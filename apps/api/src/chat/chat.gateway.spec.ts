import { ChatGateway } from "./chat.gateway";
import type { WsRateLimiter } from "./ws-rate-limiter";

type AnyClient = {
  id: string;
  data: { userId?: string; userName?: string };
  handshake: { auth?: { token?: string }; headers: Record<string, string> };
  emit: jest.Mock;
  join: jest.Mock;
  to: jest.Mock;
  disconnect: jest.Mock;
};

function makeClient(overrides?: Partial<AnyClient>): AnyClient {
  const client: AnyClient = {
    id: "socket-1",
    data: {},
    handshake: { auth: {}, headers: {} },
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    to: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };
  // client.to(...).emit(...) チェーン用
  client.to.mockReturnValue({ emit: jest.fn() });
  return client;
}

describe("ChatGateway", () => {
  let jwtMock: { verify: jest.Mock };
  let configMock: { getOrThrow: jest.Mock };
  let prismaMock: {
    user: { findUnique: jest.Mock };
    chatRoomMember: { findFirst: jest.Mock };
  };
  let chatServiceMock: { createMessage: jest.Mock };
  let i18nMock: { translate: jest.Mock };
  let serverTo: jest.Mock;
  let gateway: ChatGateway;

  beforeEach(() => {
    jwtMock = { verify: jest.fn() };
    configMock = { getOrThrow: jest.fn().mockReturnValue("test-secret") };
    prismaMock = {
      user: { findUnique: jest.fn() },
      chatRoomMember: { findFirst: jest.fn() },
    };
    chatServiceMock = { createMessage: jest.fn() };
    // 翻訳はキーをそのまま返す（中身を検証しやすくするため）
    i18nMock = { translate: jest.fn((key: string) => key) };

    gateway = new ChatGateway(
      jwtMock as never,
      configMock as never,
      prismaMock as never,
      chatServiceMock as never,
      i18nMock as never,
    );
    // broadcast 検証用に server もモック。server.to を直接参照すると
    // typescript-eslint/unbound-method に当たるので、外側に jest.fn を持っておく。
    serverTo = jest.fn().mockReturnValue({ emit: jest.fn() });
    gateway.server = { to: serverTo } as never;
  });

  // ============================================================================
  // handleConnection: JWT 検証
  // ============================================================================
  describe("handleConnection: JWT 検証", () => {
    it("token がなければ disconnect", async () => {
      const client = makeClient();

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.data.userId).toBeUndefined();
    });

    it("無効な token は disconnect", async () => {
      const client = makeClient({ handshake: { auth: { token: "bad" }, headers: {} } });
      jwtMock.verify.mockImplementation(() => {
        throw new Error("invalid");
      });

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it("削除済みユーザーは disconnect", async () => {
      const client = makeClient({ handshake: { auth: { token: "ok" }, headers: {} } });
      jwtMock.verify.mockReturnValue({ sub: "u-1" });
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u-1",
        name: "name",
        status: "active",
        deletedAt: new Date(),
      });

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it("認証成功で client.data に userId と userName をセットする", async () => {
      const client = makeClient({ handshake: { auth: { token: "ok" }, headers: {} } });
      jwtMock.verify.mockReturnValue({ sub: "u-1" });
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u-1",
        name: "太郎",
        status: "active",
        deletedAt: null,
      });

      await gateway.handleConnection(client as never);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data).toEqual({ userId: "u-1", userName: "太郎" });
    });
  });

  // ============================================================================
  // assertAuth (handleJoin 経由)
  // ============================================================================
  describe("assertAuth: 未認証クライアントは chat:error を返す", () => {
    it("data.userId が無い状態で chat:join するとエラーを emit する", async () => {
      const client = makeClient();
      await gateway.handleJoin(client as never, { roomId: "r-1" });

      expect(client.emit).toHaveBeenCalledWith("chat:error", {
        message: "errors.ws.chat_unauthenticated",
      });
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleJoin: メンバー判定
  // ============================================================================
  describe("handleJoin: ルーム参加", () => {
    it("メンバーでなければ chat:error", async () => {
      const client = makeClient({ data: { userId: "u-1", userName: "n" } });
      prismaMock.chatRoomMember.findFirst.mockResolvedValue(null);

      await gateway.handleJoin(client as never, { roomId: "r-1" });

      expect(client.emit).toHaveBeenCalledWith("chat:error", {
        message: "errors.ws.chat_not_member",
      });
      expect(client.join).not.toHaveBeenCalled();
    });

    it("メンバーなら room:<id> に join する", async () => {
      const client = makeClient({ data: { userId: "u-1", userName: "n" } });
      prismaMock.chatRoomMember.findFirst.mockResolvedValue({ id: "m-1" });

      await gateway.handleJoin(client as never, { roomId: "r-1" });

      expect(client.join).toHaveBeenCalledWith("room:r-1");
      expect(client.emit).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleMessage: rate-limit + broadcast
  // ============================================================================
  describe("handleMessage: メッセージ送信", () => {
    it("成功時は room:<id> にブロードキャストする", async () => {
      const client = makeClient({ data: { userId: "u-1", userName: "n" } });
      const message = { id: "msg-1", body: "hi" };
      chatServiceMock.createMessage.mockResolvedValue(message);
      const broadcast = { emit: jest.fn() };
      serverTo.mockReturnValue(broadcast);

      await gateway.handleMessage(client as never, { roomId: "r-1", body: "hi" });

      expect(chatServiceMock.createMessage).toHaveBeenCalledWith(
        "r-1",
        "u-1",
        "hi",
        "text",
        undefined,
      );
      expect(serverTo).toHaveBeenCalledWith("room:r-1");
      expect(broadcast.emit).toHaveBeenCalledWith("chat:message", message);
    });

    it("レート上限超過は chat:rate-limit を返し createMessage を呼ばない", async () => {
      const client = makeClient({ data: { userId: "u-1", userName: "n" } });
      // rateLimiter は ws-rate-limiter.spec で挙動を検証済。
      // ここでは check() が false を返した時の gateway の振る舞いだけ確認する。
      const limiter = (gateway as unknown as { rateLimiter: WsRateLimiter }).rateLimiter;
      jest.spyOn(limiter, "check").mockReturnValue(false);

      await gateway.handleMessage(client as never, { roomId: "r-1", body: "over" });

      expect(client.emit).toHaveBeenCalledWith("chat:rate-limit", {
        message: "errors.ws.chat_rate_limit",
      });
      expect(chatServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it("createMessage が BusinessException を投げたら messageKey を翻訳して chat:error", async () => {
      const client = makeClient({ data: { userId: "u-1", userName: "n" } });
      const err = Object.assign(new Error("fallback"), {
        messageKey: "errors.forbidden_resource.chat_room_not_member",
      });
      // BusinessException 判定は instanceof なので prototype を合わせる
      const { BusinessException } = await import("@/common/exceptions");
      Object.setPrototypeOf(err, BusinessException.prototype);
      chatServiceMock.createMessage.mockRejectedValue(err);

      await gateway.handleMessage(client as never, { roomId: "r-1", body: "x" });

      expect(client.emit).toHaveBeenCalledWith("chat:error", {
        message: "errors.forbidden_resource.chat_room_not_member",
      });
    });
  });

  // ============================================================================
  // handleRead / handleTyping: 送信者以外への broadcast
  // ============================================================================
  describe("handleRead: 既読を他メンバーに broadcast", () => {
    it("client.to(room).emit('chat:read', ...) を呼ぶ", () => {
      const client = makeClient({ data: { userId: "u-1", userName: "n" } });
      const target = { emit: jest.fn() };
      client.to.mockReturnValue(target);

      gateway.handleRead(client as never, { roomId: "r-1" });

      expect(client.to).toHaveBeenCalledWith("room:r-1");
      expect(target.emit).toHaveBeenCalledWith("chat:read", { roomId: "r-1", userId: "u-1" });
    });
  });

  describe("handleTyping: 入力中を他メンバーに broadcast", () => {
    it("userName 付きで chat:typing を流す", () => {
      const client = makeClient({ data: { userId: "u-1", userName: "太郎" } });
      const target = { emit: jest.fn() };
      client.to.mockReturnValue(target);

      gateway.handleTyping(client as never, { roomId: "r-1" });

      expect(client.to).toHaveBeenCalledWith("room:r-1");
      expect(target.emit).toHaveBeenCalledWith("chat:typing", {
        roomId: "r-1",
        userId: "u-1",
        userName: "太郎",
      });
    });
  });

  // ============================================================================
  // handleDisconnect: rateLimiter のクリーンアップ
  // ============================================================================
  describe("handleDisconnect", () => {
    it("rateLimiter.cleanup(client.id) を呼ぶ（disconnect 時のメモリリーク防止）", () => {
      const client = makeClient({ data: { userId: "u-1", userName: "n" } });
      const limiter = (gateway as unknown as { rateLimiter: WsRateLimiter }).rateLimiter;
      const cleanupSpy = jest.spyOn(limiter, "cleanup");

      gateway.handleDisconnect(client as never);

      expect(cleanupSpy).toHaveBeenCalledWith("socket-1");
    });
  });
});
