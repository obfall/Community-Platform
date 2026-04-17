"use client";

import { MoreVertical, Pencil, FolderInput, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createFileManagerApi } from "@/lib/api/files-manager";
import { getAccessToken } from "@/lib/auth";
import { useFileScope } from "@/components/files/file-scope";
import { useDeleteEntry } from "@/hooks/files/use-files-manager";
import type { FileEntry } from "@/lib/api/types";

interface FileRowActionsProps {
  entry: FileEntry;
  onRename: (entry: FileEntry) => void;
  onMove: (entry: FileEntry) => void;
}

export function FileRowActions({ entry, onRename, onMove }: FileRowActionsProps) {
  const scope = useFileScope();
  const deleteMutation = useDeleteEntry();

  const handleDelete = () => {
    if (
      !confirm(
        entry.type === "folder"
          ? "このフォルダとその中身をすべて削除しますか？"
          : "このファイルを削除しますか？",
      )
    ) {
      return;
    }
    deleteMutation.mutate(entry.id);
  };

  const handleDownload = async () => {
    if (entry.type !== "file") return;
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onRename(entry)}>
          <Pencil className="mr-2 h-4 w-4" />
          名前を変更
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMove(entry)}>
          <FolderInput className="mr-2 h-4 w-4" />
          移動
        </DropdownMenuItem>
        {entry.type === "file" && (
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            ダウンロード
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          削除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
