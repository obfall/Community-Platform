"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRenameEntry } from "@/hooks/files/use-files-manager";
import type { FileEntry } from "@/lib/api/types";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FileEntry;
}

export function RenameDialog({ open, onOpenChange, entry }: RenameDialogProps) {
  const [name, setName] = useState(entry.name);
  const renameMutation = useRenameEntry();

  // entry が変わったら name をリセット（key prop でマウントを制御するため通常は不要だが安全策）
  const [prevEntryId, setPrevEntryId] = useState(entry.id);
  if (entry.id !== prevEntryId) {
    setPrevEntryId(entry.id);
    setName(entry.name);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    renameMutation.mutate(
      { id: entry.id, data: { name: name.trim() } },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>名前を変更</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={!name.trim() || renameMutation.isPending}>
              {renameMutation.isPending ? "変更中..." : "変更"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
