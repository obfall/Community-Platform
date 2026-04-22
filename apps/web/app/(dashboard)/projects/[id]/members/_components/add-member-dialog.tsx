"use client";

import { useMemo, useState } from "react";
import { useMembers } from "@/hooks/members/use-members";
import { useAddProjectMember } from "@/hooks/projects/use-projects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";

interface AddMemberDialogProps {
  projectId: string;
  existingUserIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({
  projectId,
  existingUserIds,
  open,
  onOpenChange,
}: AddMemberDialogProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useMembers({
    search: search || undefined,
    status: "active",
    limit: 50,
    page: 1,
  });
  const addMember = useAddProjectMember(projectId);

  const candidates = useMemo(() => {
    const users = data?.data ?? [];
    const exclude = new Set(existingUserIds);
    return users.filter((u) => !exclude.has(u.id));
  }, [data, existingUserIds]);

  const handleClose = (next: boolean) => {
    if (!next) setSearch("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>メンバーを追加</DialogTitle>
          <DialogDescription>プロジェクトに参加させるユーザーを選択してください</DialogDescription>
        </DialogHeader>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="名前・メールで検索..."
          autoFocus
        />

        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              読み込み中...
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              {search ? "該当するユーザーが見つかりません" : "追加できるユーザーがいません"}
            </div>
          ) : (
            <ul className="divide-y">
              {candidates.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
                    <AvatarFallback className="text-xs">{u.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addMember.isPending}
                    onClick={() => addMember.mutate(u.id, { onSuccess: () => handleClose(false) })}
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    追加
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
