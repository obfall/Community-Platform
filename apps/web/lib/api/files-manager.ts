import { apiClient } from "./client";
import { fileBasePath, type FileScope } from "@/components/files/file-scope";
import type {
  FileEntry,
  FolderDetail,
  CreateFolderInput,
  RegisterFileInput,
  RenameInput,
  MoveInput,
  ReorderInput,
  FileListQuery,
} from "./types";

export function createFileManagerApi(scope: FileScope) {
  const base = fileBasePath(scope);

  return {
    list: (params?: FileListQuery) =>
      apiClient.get<FileEntry[]>(base, { params }).then((r) => r.data),

    getFolder: (folderId: string) =>
      apiClient.get<FolderDetail>(`${base}/folders/${folderId}`).then((r) => r.data),

    createFolder: (data: CreateFolderInput) =>
      apiClient.post<FileEntry>(`${base}/folders`, data).then((r) => r.data),

    registerFile: (data: RegisterFileInput) =>
      apiClient.post<FileEntry>(base, data).then((r) => r.data),

    rename: (id: string, data: RenameInput) =>
      apiClient.patch<FileEntry>(`${base}/${id}`, data).then((r) => r.data),

    move: (id: string, data: MoveInput) =>
      apiClient.patch<FileEntry>(`${base}/${id}/move`, data).then((r) => r.data),

    reorder: (data: ReorderInput) => apiClient.patch(`${base}/reorder`, data).then((r) => r.data),

    remove: (id: string) =>
      apiClient.delete<{ deletedCount: number }>(`${base}/${id}`).then((r) => r.data),

    downloadUrl: (id: string) => `${apiClient.defaults.baseURL}${base}/${id}/download`,
  };
}
