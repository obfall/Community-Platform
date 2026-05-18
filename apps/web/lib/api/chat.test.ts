import { describe, it, expect, vi, beforeEach } from "vitest";

// apiClient をモック（vi.hoisted で vi.mock の hoisting に対応）
const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("./client", () => ({
  apiClient: apiClientMock,
}));

import { chatApi } from "./chat";

describe("chatApi: チャット API クライアント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getRooms は GET /chat/rooms を呼ぶ", async () => {
    apiClientMock.get.mockResolvedValue({ data: [] });
    await chatApi.getRooms();
    expect(apiClientMock.get).toHaveBeenCalledWith("/chat/rooms");
  });

  it("createRoom は POST /chat/rooms に dto を送る", async () => {
    apiClientMock.post.mockResolvedValue({ data: { id: "r-1" } });
    const dto = { type: "dm" as const, memberIds: ["u-2"] };
    await chatApi.createRoom(dto);
    expect(apiClientMock.post).toHaveBeenCalledWith("/chat/rooms", dto);
  });

  it("getRoom は GET /chat/rooms/:id を呼ぶ", async () => {
    apiClientMock.get.mockResolvedValue({ data: { id: "r-1" } });
    await chatApi.getRoom("r-1");
    expect(apiClientMock.get).toHaveBeenCalledWith("/chat/rooms/r-1");
  });

  it("updateRoom は PATCH /chat/rooms/:id に dto を送る", async () => {
    apiClientMock.patch.mockResolvedValue({ data: { id: "r-1" } });
    const dto = { name: "更新後" };
    await chatApi.updateRoom("r-1", dto);
    expect(apiClientMock.patch).toHaveBeenCalledWith("/chat/rooms/r-1", dto);
  });

  it("getMessages は GET /chat/rooms/:id/messages を params 付きで呼ぶ", async () => {
    apiClientMock.get.mockResolvedValue({ data: { data: [], meta: {} } });
    await chatApi.getMessages("r-1", { page: 1, limit: 50 });
    expect(apiClientMock.get).toHaveBeenCalledWith("/chat/rooms/r-1/messages", {
      params: { page: 1, limit: 50 },
    });
  });

  it("addMember は POST /chat/rooms/:id/members に { userId } を送る", async () => {
    apiClientMock.post.mockResolvedValue({ data: { id: "r-1" } });
    await chatApi.addMember("r-1", "u-2");
    expect(apiClientMock.post).toHaveBeenCalledWith("/chat/rooms/r-1/members", {
      userId: "u-2",
    });
  });

  it("removeMember は DELETE /chat/rooms/:id/members/:userId を呼ぶ", async () => {
    apiClientMock.delete.mockResolvedValue({});
    await chatApi.removeMember("r-1", "u-2");
    expect(apiClientMock.delete).toHaveBeenCalledWith("/chat/rooms/r-1/members/u-2");
  });

  it("markAsRead は PATCH /chat/rooms/:id/read を呼ぶ", async () => {
    apiClientMock.patch.mockResolvedValue({});
    await chatApi.markAsRead("r-1");
    expect(apiClientMock.patch).toHaveBeenCalledWith("/chat/rooms/r-1/read");
  });

  it("toggleMute は PATCH /chat/rooms/:id/mute を呼ぶ", async () => {
    apiClientMock.patch.mockResolvedValue({ data: { isMuted: true } });
    await chatApi.toggleMute("r-1");
    expect(apiClientMock.patch).toHaveBeenCalledWith("/chat/rooms/r-1/mute");
  });
});
