import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

// API クライアント / toast モックは vi.mock のファクトリから直接参照するため、
// hoisting タイミングで初期化済みになる vi.hoisted に入れる必要がある。
const { apiMock, toastMock } = vi.hoisted(() => ({
  apiMock: {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    getThreads: vi.fn(),
    createThread: vi.fn(),
    getReplies: vi.fn(),
    createReply: vi.fn(),
    toggleThreadLike: vi.fn(),
    toggleReplyLike: vi.fn(),
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getSchedules: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    joinByToken: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/projects", () => ({
  projectsApi: apiMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import {
  useProjects,
  useProject,
  useProjectThreads,
  useProjectTasks,
  useProjectSchedules,
  useThreadReplies,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectMember,
  useUpdateProjectMemberRole,
  useRemoveProjectMember,
  useCreateThread,
  useCreateReply,
  useToggleThreadLike,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useDeleteProjectSchedule,
} from "./use-projects";

describe("projects hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useProjects: プロジェクト一覧取得", () => {
    it("api.getProjects が query 付きで呼ばれ、データが返る", async () => {
      const payload = { data: [{ id: "p-1", name: "Project1" }], meta: { total: 1 } };
      apiMock.getProjects.mockResolvedValue(payload);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useProjects({ page: 1, limit: 12 }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getProjects).toHaveBeenCalledWith({ page: 1, limit: 12 });
      expect(result.current.data).toBe(payload);
    });
  });

  describe("useProject: 単件取得", () => {
    it("id が指定されたとき api.getProject が呼ばれる", async () => {
      apiMock.getProject.mockResolvedValue({ id: "p-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useProject("p-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getProject).toHaveBeenCalledWith("p-1");
    });

    it("id が undefined なら fetch されない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useProject(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getProject).not.toHaveBeenCalled();
    });
  });

  describe("useProjectThreads: enabled 制御", () => {
    it("projectId 未指定なら getThreads は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useProjectThreads(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getThreads).not.toHaveBeenCalled();
    });
  });

  describe("useProjectTasks: enabled 制御", () => {
    it("projectId 未指定なら getTasks は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useProjectTasks(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getTasks).not.toHaveBeenCalled();
    });
  });

  describe("useProjectSchedules: enabled 制御 + query 渡し", () => {
    it("projectId 未指定なら getSchedules は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useProjectSchedules(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getSchedules).not.toHaveBeenCalled();
    });

    it("projectId 指定で getSchedules に query が渡る", async () => {
      apiMock.getSchedules.mockResolvedValue([]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(
        () => useProjectSchedules("p-1", { startAt: "2026-05-01", endAt: "2026-05-31" }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getSchedules).toHaveBeenCalledWith("p-1", {
        startAt: "2026-05-01",
        endAt: "2026-05-31",
      });
    });
  });

  describe("useThreadReplies: enabled 制御", () => {
    it("threadId 未指定なら useThreadReplies は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useThreadReplies(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getReplies).not.toHaveBeenCalled();
    });
  });

  describe("useCreateProject: プロジェクト作成", () => {
    it("成功時 createProject が呼ばれ、成功 toast が表示される", async () => {
      apiMock.createProject.mockResolvedValue({ id: "p-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateProject(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: "新規", status: "not_started" });
      });

      expect(apiMock.createProject).toHaveBeenCalledWith({ name: "新規", status: "not_started" });
      expect(toastMock.success).toHaveBeenCalled();
    });

    it("失敗時 mutation はエラーで reject する（エラートーストは providers.tsx に集約）", async () => {
      apiMock.createProject.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateProject(), { wrapper });

      await act(async () => {
        await expect(
          result.current.mutateAsync({ name: "x", status: "not_started" }),
        ).rejects.toThrow();
      });

      expect(toastMock.success).not.toHaveBeenCalled();
      // toast.error は hook 内では呼ばない（MutationCache.onError で一元処理する規約）
      expect(toastMock.error).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateProject: 更新", () => {
    it("updateProject に id / data が渡され、成功 toast が表示される", async () => {
      apiMock.updateProject.mockResolvedValue({ id: "p-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateProject(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "p-1", data: { name: "更新後" } });
      });

      expect(apiMock.updateProject).toHaveBeenCalledWith("p-1", { name: "更新後" });
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  describe("useDeleteProject: 削除", () => {
    it("deleteProject に id が渡され、成功 toast が表示される", async () => {
      apiMock.deleteProject.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteProject(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("p-1");
      });

      expect(apiMock.deleteProject).toHaveBeenCalledWith("p-1");
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  describe("メンバー系 mutations", () => {
    it("useAddProjectMember は projectId / userId / role を API に渡す", async () => {
      apiMock.addMember.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAddProjectMember("p-1"), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ userId: "u-2", role: "admin" });
      });

      expect(apiMock.addMember).toHaveBeenCalledWith("p-1", "u-2", "admin");
      expect(toastMock.success).toHaveBeenCalled();
    });

    it("useUpdateProjectMemberRole は projectId / userId / role を API に渡す", async () => {
      apiMock.updateMemberRole.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateProjectMemberRole("p-1"), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ userId: "u-2", role: "member" });
      });

      expect(apiMock.updateMemberRole).toHaveBeenCalledWith("p-1", "u-2", "member");
    });

    it("useRemoveProjectMember は projectId / userId を API に渡す", async () => {
      apiMock.removeMember.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useRemoveProjectMember("p-1"), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("u-2");
      });

      expect(apiMock.removeMember).toHaveBeenCalledWith("p-1", "u-2");
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  describe("メッセージ系 mutations", () => {
    it("useCreateThread は projectId / title を渡す", async () => {
      apiMock.createThread.mockResolvedValue({ id: "th-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateThread(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ projectId: "p-1", title: "Hi" });
      });

      expect(apiMock.createThread).toHaveBeenCalledWith("p-1", "Hi");
    });

    it("useCreateReply は threadId / body を渡す", async () => {
      apiMock.createReply.mockResolvedValue({ id: "r-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateReply(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ threadId: "th-1", body: "おはよう" });
      });

      expect(apiMock.createReply).toHaveBeenCalledWith("th-1", "おはよう");
    });

    it("useToggleThreadLike は threadId を渡し、トースト出さない", async () => {
      apiMock.toggleThreadLike.mockResolvedValue({ liked: true });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useToggleThreadLike(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("th-1");
      });

      expect(apiMock.toggleThreadLike).toHaveBeenCalledWith("th-1");
      expect(toastMock.success).not.toHaveBeenCalled();
    });
  });

  describe("タスク系 mutations", () => {
    it("useCreateTask は projectId / data を渡す", async () => {
      apiMock.createTask.mockResolvedValue({ id: "tk-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateTask(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: "p-1",
          data: { title: "やる" },
        });
      });

      expect(apiMock.createTask).toHaveBeenCalledWith("p-1", { title: "やる" });
    });

    it("useUpdateTask は taskId / data を渡す", async () => {
      apiMock.updateTask.mockResolvedValue({ id: "tk-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ taskId: "tk-1", data: { status: "completed" } });
      });

      expect(apiMock.updateTask).toHaveBeenCalledWith("tk-1", { status: "completed" });
    });

    it("useDeleteTask は taskId を渡す", async () => {
      apiMock.deleteTask.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("tk-1");
      });

      expect(apiMock.deleteTask).toHaveBeenCalledWith("tk-1");
    });
  });

  describe("スケジュール系 mutations", () => {
    it("useCreateProjectSchedule は projectId と data を渡す", async () => {
      apiMock.createSchedule.mockResolvedValue({ id: "sc-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateProjectSchedule("p-1"), { wrapper });

      const payload = {
        title: "会議",
        startAt: "2026-05-21T09:00:00Z",
        endAt: "2026-05-21T10:00:00Z",
      };
      await act(async () => {
        await result.current.mutateAsync(payload);
      });

      expect(apiMock.createSchedule).toHaveBeenCalledWith("p-1", payload);
    });

    it("useUpdateProjectSchedule は scheduleId と data を渡す", async () => {
      apiMock.updateSchedule.mockResolvedValue({ id: "sc-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateProjectSchedule("p-1"), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ scheduleId: "sc-1", data: { title: "更新" } });
      });

      expect(apiMock.updateSchedule).toHaveBeenCalledWith("p-1", "sc-1", { title: "更新" });
    });

    it("useDeleteProjectSchedule は scheduleId を渡す", async () => {
      apiMock.deleteSchedule.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteProjectSchedule("p-1"), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("sc-1");
      });

      expect(apiMock.deleteSchedule).toHaveBeenCalledWith("p-1", "sc-1");
    });
  });
});
