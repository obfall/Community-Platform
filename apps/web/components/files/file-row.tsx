"use client";

import { Folder, FileText, ImageIcon, Film, File as FileIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { FileRowActions } from "./file-row-actions";
import { createFileManagerApi } from "@/lib/api/files-manager";
import { getAccessToken } from "@/lib/auth";
import { useFileScope } from "@/components/files/file-scope";
import type { FileEntry } from "@/lib/api/types";

interface FileRowProps {
  entry: FileEntry;
  onFolderClick: (id: string) => void;
  onRename: (entry: FileEntry) => void;
  onMove: (entry: FileEntry) => void;
}

function getFileIcon(entry: FileEntry) {
  if (entry.type === "folder") return <Folder className="h-5 w-5 text-blue-500" />;

  const contentType = entry.file?.contentType ?? "";
  if (contentType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-green-500" />;
  if (contentType.startsWith("video/")) return <Film className="h-5 w-5 text-purple-500" />;
  if (
    contentType === "application/pdf" ||
    contentType.includes("document") ||
    contentType.includes("spreadsheet") ||
    contentType.includes("presentation")
  )
    return <FileText className="h-5 w-5 text-orange-500" />;

  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function FileRow({ entry, onFolderClick, onRename, onMove }: FileRowProps) {
  const scope = useFileScope();

  const handleClick = async () => {
    if (entry.type === "folder") {
      onFolderClick(entry.id);
      return;
    }
    try {
      const api = createFileManagerApi(scope);
      const url = api.downloadUrl(entry.id);
      const token = getAccessToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("ダウンロードに失敗しました");
    }
  };

  return (
    <TableRow className="cursor-pointer" onClick={handleClick}>
      <TableCell>
        <div className="flex items-center gap-3">
          {getFileIcon(entry)}
          <span className="truncate font-medium">{entry.name}</span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <span className="text-sm text-muted-foreground">{entry.uploadedBy.name}</span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true, locale: ja })}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-sm text-muted-foreground">
          {entry.type === "file" && entry.file ? formatFileSize(entry.file.fileSizeBytes) : "—"}
        </span>
      </TableCell>
      <TableCell>
        <div onClick={(e) => e.stopPropagation()}>
          <FileRowActions entry={entry} onRename={onRename} onMove={onMove} />
        </div>
      </TableCell>
    </TableRow>
  );
}
