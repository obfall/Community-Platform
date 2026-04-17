export interface FileManagerScopeConfig {
  scopeField: "projectId" | "eventId" | null;
  delegate: "projectFile" | "eventFile"; // 将来 "globalFile" 追加
}

export type SortField = "name" | "updatedAt" | "size";
export type SortOrder = "asc" | "desc";

export interface ListOpts {
  folderId?: string;
  search?: string;
  sort: SortField;
  order: SortOrder;
}

export interface FileRow {
  id: string;
  type: "file" | "folder";
  name: string;
  parentFolderId: string | null;
  sortOrder: number;
  uploadedBy: { id: string; name: string; avatarUrl: string | null };
  createdAt: Date;
  updatedAt: Date;
  file: {
    id: string;
    originalName: string;
    contentType: string;
    fileSizeBytes: number;
    publicUrl: string | null;
    thumbnailUrl: string | null;
  } | null;
}

export interface FolderDetail {
  id: string;
  name: string;
  parentFolderId: string | null;
  breadcrumb: Array<{ id: string; name: string }>;
}
