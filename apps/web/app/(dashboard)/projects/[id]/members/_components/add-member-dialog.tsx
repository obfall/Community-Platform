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
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/select-field";
import { Loader2, UserPlus } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "member", label: "メンバー" },
  { value: "admin", label: "ホスト" },
];

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
  const [role, setRole] = useState<"admin" | "member">("member");
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
    if (!next) {
      setSearch("");
      setRole("member");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>メンバーを追加</DialogTitle>
          <DialogDescription>プロジェクトに参加させるユーザーを選択してください</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-xs">追加時のロール</Label>
          <SelectField
            value={role}
            onChange={(v) => setRole(v as "admin" | "member")}
            options={ROLE_OPTIONS}
            className="w-full"
          />
        </div>

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
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addMember.isPending}
                    onClick={() =>
                      addMember.mutate(
                        { userId: u.id, role },
                        { onSuccess: () => handleClose(false) },
                      )
                    }
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
