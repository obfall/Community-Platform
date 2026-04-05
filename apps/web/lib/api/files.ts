import { apiClient } from "./client";

export interface UploadedFile {
  id: string;
  originalName: string;
  publicUrl: string | null;
  contentType: string;
  fileSizeBytes: number;
  fileCategory: string;
}

export const filesApi = {
  upload: (file: File, fileCategory: string, isPublic = true) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileCategory", fileCategory);
    formData.append("isPublic", String(isPublic));
    return apiClient.post<UploadedFile>("/files/upload", formData).then((r) => r.data);
  },
};
