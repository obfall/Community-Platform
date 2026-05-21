import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { projectsApi } from "./projects";

describe("projectsApi: REST 呼び出し", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("プロジェクト一覧/単件", () => {
    it("getProjects は GET /projects に params を渡し data を取り出す", async () => {
      apiClientMock.get.mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
      const result = await projectsApi.getProjects({ page: 1, limit: 12, status: "in_progress" });

      expect(apiClientMock.get).toHaveBeenCalledWith("/projects", {
        params: { page: 1, limit: 12, status: "in_progress" },
      });
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });

    it("getProject は GET /projects/:id を呼ぶ", async () => {
      apiClientMock.get.mockResolvedValue({ data: { id: "p-1" } });
      await projectsApi.getProject("p-1");
      expect(apiClientMock.get).toHaveBeenCalledWith("/projects/p-1");
    });
  });

  describe("作成 / 更新 / 削除", () => {
    it("createProject は POST /projects に dto を送る", async () => {
      apiClientMock.post.mockResolvedValue({ data: { id: "p-1" } });
      const dto = { name: "新規", status: "not_started" as const };
      await projectsApi.createProject(dto);
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects", dto);
    });

    it("updateProject は PATCH /projects/:id に dto を送る", async () => {
      apiClientMock.patch.mockResolvedValue({ data: { id: "p-1" } });
      await projectsApi.updateProject("p-1", { name: "更新後", inviteLinkEnabled: false });
      expect(apiClientMock.patch).toHaveBeenCalledWith("/projects/p-1", {
        name: "更新後",
        inviteLinkEnabled: false,
      });
    });

    it("deleteProject は DELETE /projects/:id を呼ぶ", async () => {
      apiClientMock.delete.mockResolvedValue({ data: undefined });
      await projectsApi.deleteProject("p-1");
      expect(apiClientMock.delete).toHaveBeenCalledWith("/projects/p-1");
    });

    it("joinByToken は POST /projects/join/:token を呼ぶ", async () => {
      apiClientMock.post.mockResolvedValue({ data: { id: "p-1" } });
      await projectsApi.joinByToken("tok-abc");
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/join/tok-abc");
    });
  });

  describe("メンバー操作", () => {
    it("addMember は role 指定時 { role } body を送る", async () => {
      apiClientMock.post.mockResolvedValue({ data: undefined });
      await projectsApi.addMember("p-1", "u-2", "admin");
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/p-1/members/u-2", {
        role: "admin",
      });
    });

    it("addMember は role 未指定時 空 body を送る", async () => {
      apiClientMock.post.mockResolvedValue({ data: undefined });
      await projectsApi.addMember("p-1", "u-2");
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/p-1/members/u-2", {});
    });

    it("updateMemberRole は PATCH /role を呼ぶ", async () => {
      apiClientMock.patch.mockResolvedValue({ data: undefined });
      await projectsApi.updateMemberRole("p-1", "u-2", "member");
      expect(apiClientMock.patch).toHaveBeenCalledWith("/projects/p-1/members/u-2/role", {
        role: "member",
      });
    });

    it("removeMember は DELETE を呼ぶ", async () => {
      apiClientMock.delete.mockResolvedValue({ data: undefined });
      await projectsApi.removeMember("p-1", "u-2");
      expect(apiClientMock.delete).toHaveBeenCalledWith("/projects/p-1/members/u-2");
    });
  });

  describe("メッセージ（スレッド / 返信）", () => {
    it("getThreads は params 付きで GET /:projectId/threads を呼ぶ", async () => {
      apiClientMock.get.mockResolvedValue({ data: { data: [], meta: {} } });
      await projectsApi.getThreads("p-1", { page: 2 });
      expect(apiClientMock.get).toHaveBeenCalledWith("/projects/p-1/threads", {
        params: { page: 2 },
      });
    });

    it("createThread は title を body に含めて POST する", async () => {
      apiClientMock.post.mockResolvedValue({ data: { id: "th-1" } });
      await projectsApi.createThread("p-1", "件名");
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/p-1/threads", { title: "件名" });
    });

    it("getReplies は GET /threads/:threadId/replies を呼ぶ", async () => {
      apiClientMock.get.mockResolvedValue({ data: [] });
      await projectsApi.getReplies("th-1");
      expect(apiClientMock.get).toHaveBeenCalledWith("/projects/threads/th-1/replies");
    });

    it("createReply は body を POST する", async () => {
      apiClientMock.post.mockResolvedValue({ data: { id: "r-1" } });
      await projectsApi.createReply("th-1", "おはよう");
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/threads/th-1/replies", {
        body: "おはよう",
      });
    });

    it("toggleThreadLike は POST /:threadId/like を呼ぶ", async () => {
      apiClientMock.post.mockResolvedValue({ data: { liked: true } });
      await projectsApi.toggleThreadLike("th-1");
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/threads/th-1/like");
    });

    it("toggleReplyLike は POST /:replyId/like を呼ぶ", async () => {
      apiClientMock.post.mockResolvedValue({ data: { liked: true } });
      await projectsApi.toggleReplyLike("r-1");
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/replies/r-1/like");
    });
  });

  describe("タスク", () => {
    it("getTasks は GET /:projectId/tasks を呼ぶ", async () => {
      apiClientMock.get.mockResolvedValue({ data: [] });
      await projectsApi.getTasks("p-1");
      expect(apiClientMock.get).toHaveBeenCalledWith("/projects/p-1/tasks");
    });

    it("createTask は data を POST する", async () => {
      apiClientMock.post.mockResolvedValue({ data: { id: "tk-1" } });
      const data = { title: "やる", dueDate: "2026-05-25", assigneeIds: ["u-1"] };
      await projectsApi.createTask("p-1", data);
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/p-1/tasks", data);
    });

    it("updateTask は PATCH /projects/tasks/:taskId を呼ぶ", async () => {
      apiClientMock.patch.mockResolvedValue({ data: { id: "tk-1" } });
      await projectsApi.updateTask("tk-1", { status: "completed" });
      expect(apiClientMock.patch).toHaveBeenCalledWith("/projects/tasks/tk-1", {
        status: "completed",
      });
    });

    it("deleteTask は DELETE /projects/tasks/:taskId を呼ぶ", async () => {
      apiClientMock.delete.mockResolvedValue({ data: undefined });
      await projectsApi.deleteTask("tk-1");
      expect(apiClientMock.delete).toHaveBeenCalledWith("/projects/tasks/tk-1");
    });
  });

  describe("スケジュール", () => {
    it("getSchedules は params 付きで GET を呼ぶ", async () => {
      apiClientMock.get.mockResolvedValue({ data: [] });
      await projectsApi.getSchedules("p-1", { startAt: "2026-05-01", endAt: "2026-05-31" });
      expect(apiClientMock.get).toHaveBeenCalledWith("/projects/p-1/schedules", {
        params: { startAt: "2026-05-01", endAt: "2026-05-31" },
      });
    });

    it("createSchedule は data を POST する", async () => {
      apiClientMock.post.mockResolvedValue({ data: { id: "sc-1" } });
      const data = {
        title: "会議",
        startAt: "2026-05-21T00:00:00Z",
        endAt: "2026-05-21T01:00:00Z",
      };
      await projectsApi.createSchedule("p-1", data);
      expect(apiClientMock.post).toHaveBeenCalledWith("/projects/p-1/schedules", data);
    });

    it("updateSchedule は PATCH を呼ぶ", async () => {
      apiClientMock.patch.mockResolvedValue({ data: { id: "sc-1" } });
      await projectsApi.updateSchedule("p-1", "sc-1", { title: "更新" });
      expect(apiClientMock.patch).toHaveBeenCalledWith("/projects/p-1/schedules/sc-1", {
        title: "更新",
      });
    });

    it("deleteSchedule は DELETE を呼ぶ", async () => {
      apiClientMock.delete.mockResolvedValue({ data: undefined });
      await projectsApi.deleteSchedule("p-1", "sc-1");
      expect(apiClientMock.delete).toHaveBeenCalledWith("/projects/p-1/schedules/sc-1");
    });
  });
});
