import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createFileManagerApi } from "@/lib/api/files-manager";
import { useFileScope, fileScopeKey, type FileScope } from "@/components/files/file-scope";
import type {
  CreateFolderInput,
  RegisterFileInput,
  RenameInput,
  MoveInput,
  ReorderInput,
  FileListQuery,
} from "@/lib/api/types";

function useFileManagerApi() {
  const scope = useFileScope();
  return { api: createFileManagerApi(scope), scope };
}

function keyOf(scope: FileScope, ...parts: readonly unknown[]): readonly unknown[] {
  return ["files", ...fileScopeKey(scope), ...parts];
}

// --- Queries ---

export function useFileList(opts: FileListQuery = {}) {
  const { api, scope } = useFileManagerApi();
  return useQuery({
    queryKey: keyOf(scope, "list", opts.folderId ?? "root", opts.sort, opts.order, opts.q),
    queryFn: () => api.list(opts),
    staleTime: 30 * 1000,
  });
}

export function useFolder(folderId: string | undefined) {
  const { api, scope } = useFileManagerApi();
  return useQuery({
    queryKey: keyOf(scope, "folder", folderId),
    queryFn: () => api.getFolder(folderId!),
    enabled: !!folderId,
    staleTime: 60 * 1000,
  });
}

// --- Mutations ---

export function useCreateFolder() {
  const { api, scope } = useFileManagerApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFolderInput) => api.createFolder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keyOf(scope, "list") });
      toast.success("フォルダを作成しました");
    },
    onError: () => toast.error("フォルダの作成に失敗しました"),
  });
}

export function useRegisterFile() {
  const { api, scope } = useFileManagerApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterFileInput) => api.registerFile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keyOf(scope, "list") });
    },
    onError: () => toast.error("ファイルの登録に失敗しました"),
  });
}

export function useRenameEntry() {
  const { api, scope } = useFileManagerApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RenameInput }) => api.rename(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keyOf(scope, "list") });
      toast.success("名前を変更しました");
    },
    onError: () => toast.error("名前の変更に失敗しました"),
  });
}

export function useMoveEntry() {
  const { api, scope } = useFileManagerApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveInput }) => api.move(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keyOf(scope, "list") });
      qc.invalidateQueries({ queryKey: keyOf(scope, "folder") });
      toast.success("移動しました");
    },
    onError: () => toast.error("移動に失敗しました"),
  });
}

export function useDeleteEntry() {
  const { api, scope } = useFileManagerApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: keyOf(scope, "list") });
      toast.success(
        result.deletedCount > 1 ? `${result.deletedCount} 件を削除しました` : "削除しました",
      );
    },
    onError: () => toast.error("削除に失敗しました"),
  });
}

export function useReorder() {
  const { api, scope } = useFileManagerApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderInput) => api.reorder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keyOf(scope, "list") });
    },
    onError: () => toast.error("並び替えに失敗しました"),
  });
}
