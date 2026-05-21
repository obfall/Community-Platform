import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { projectsApi } from "@/lib/api/projects";
import type { ProjectQuery, CreateProjectInput } from "@/lib/api/types";

// onError は providers.tsx の MutationCache.onError に集約しているため、
// 各 mutation には onError を書かない（Phase 11.3 エラーハンドリング規約）。

export function useProjects(query?: ProjectQuery) {
  return useQuery({
    queryKey: ["projects", query],
    queryFn: () => projectsApi.getProjects(query),
    staleTime: 30 * 1000,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsApi.getProject(id!),
    enabled: !!id,
  });
}

export function useProjectThreads(
  projectId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["projects", projectId, "threads", query],
    queryFn: () => projectsApi.getThreads(projectId!, query),
    enabled: !!projectId,
  });
}

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => projectsApi.getTasks(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("projectCreated"));
    },
  });
}

export function useUpdateProject() {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProjectInput> }) =>
      projectsApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("projectUpdated"));
    },
  });
}

export function useDeleteProject() {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("projectDeleted"));
    },
  });
}

export function useAddProjectMember(projectId: string) {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role?: "admin" | "member" }) =>
      projectsApi.addMember(projectId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      toast.success(t("memberAdded"));
    },
  });
}

export function useUpdateProjectMemberRole(projectId: string) {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
      projectsApi.updateMemberRole(projectId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      toast.success(t("memberRoleUpdated"));
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      toast.success(t("memberRemoved"));
    },
  });
}

export function useCreateThread() {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, title }: { projectId: string; title: string }) =>
      projectsApi.createThread(projectId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("messageCreated"));
    },
  });
}

export function useThreadReplies(threadId: string | undefined) {
  return useQuery({
    queryKey: ["projects", "threads", threadId, "replies"],
    queryFn: () => projectsApi.getReplies(threadId!),
    enabled: !!threadId,
  });
}

export function useCreateReply() {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) =>
      projectsApi.createReply(threadId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("replyCreated"));
    },
  });
}

export function useToggleThreadLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => projectsApi.toggleThreadLike(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useToggleReplyLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (replyId: string) => projectsApi.toggleReplyLike(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useCreateTask() {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: {
        title: string;
        description?: string;
        dueDate?: string;
        requestedDate?: string;
        assigneeIds?: string[];
        fileIds?: string[];
      };
    }) => projectsApi.createTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("taskCreated"));
    },
  });
}

export function useUpdateTask() {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: {
        title?: string;
        description?: string;
        status?: string;
        requestedDate?: string | null;
        dueDate?: string | null;
        assigneeIds?: string[];
        fileIds?: string[];
      };
    }) => projectsApi.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("taskUpdated"));
    },
  });
}

export function useDeleteTask() {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => projectsApi.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("taskDeleted"));
    },
  });
}

export function useProjectSchedules(
  projectId: string | undefined,
  query?: { startAt?: string; endAt?: string },
) {
  return useQuery({
    queryKey: ["projects", projectId, "schedules", query],
    queryFn: () => projectsApi.getSchedules(projectId!, query),
    enabled: !!projectId,
  });
}

export function useCreateProjectSchedule(projectId: string) {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      isAllDay?: boolean;
      location?: string;
    }) => projectsApi.createSchedule(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "schedules"] });
      toast.success(t("scheduleCreated"));
    },
  });
}

export function useUpdateProjectSchedule(projectId: string) {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      data,
    }: {
      scheduleId: string;
      data: {
        title?: string;
        description?: string;
        startAt?: string;
        endAt?: string;
        isAllDay?: boolean;
        location?: string;
      };
    }) => projectsApi.updateSchedule(projectId, scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "schedules"] });
      toast.success(t("scheduleUpdated"));
    },
  });
}

export function useDeleteProjectSchedule(projectId: string) {
  const t = useTranslations("projects.toast");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => projectsApi.deleteSchedule(projectId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "schedules"] });
      toast.success(t("scheduleDeleted"));
    },
  });
}
