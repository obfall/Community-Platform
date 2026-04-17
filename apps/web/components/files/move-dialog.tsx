"use client";

import { useState } from "react";
import { Folder, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFileList, useMoveEntry } from "@/hooks/files/use-files-manager";
import type { FileEntry } from "@/lib/api/types";

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FileEntry;
  currentFolderId?: string;
}

export function MoveDialog({ open, onOpenChange, entry, currentFolderId }: MoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [browsingFolderId, setBrowsingFolderId] = useState<string | undefined>(undefined);
  const moveMutation = useMoveEntry();

  // フォルダ一覧を取得（ルートまたは選択中のフォルダ）
  const { data: entries = [] } = useFileList({
    folderId: browsingFolderId,
    sort: "name",
    order: "asc",
  });

  const folders = entries.filter((e) => e.type === "folder" && e.id !== entry.id);

  const handleMove = () => {
    moveMutation.mutate(
      { id: entry.id, data: { parentFolderId: selectedFolderId } },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  const handleSelectRoot = () => {
    setSelectedFolderId(null);
    setBrowsingFolderId(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>「{entry.name}」の移動先</DialogTitle>
        </DialogHeader>

        <div className="max-h-[300px] space-y-1 overflow-y-auto rounded border p-2">
          <button
            type="button"
            onClick={handleSelectRoot}
            className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-accent ${
              selectedFolderId === null && browsingFolderId === undefined
                ? "bg-accent font-medium"
                : ""
            }`}
          >
            <Folder className="h-4 w-4 text-blue-500" />
            ファイル
          </button>

          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex flex-1 items-center gap-2 rounded-l px-3 py-2 text-left text-sm hover:bg-accent ${
                  selectedFolderId === folder.id ? "bg-accent font-medium" : ""
                }`}
              >
                <Folder className="h-4 w-4 text-blue-500" />
                {folder.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrowsingFolderId(folder.id);
                  setSelectedFolderId(folder.id);
                }}
                className="rounded-r px-2 py-2 hover:bg-accent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}

          {folders.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">フォルダがありません</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleMove}
            disabled={moveMutation.isPending || selectedFolderId === (currentFolderId ?? null)}
          >
            {moveMutation.isPending ? "移動中..." : "ここに移動"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
