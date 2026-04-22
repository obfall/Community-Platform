"use client";

import { use, useState } from "react";
import { useProject, useRemoveProjectMember } from "@/hooks/projects/use-projects";
import { useAuth } from "@/hooks/auth/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, UserPlus } from "lucide-react";
import type { ProjectMember } from "@/lib/api/types";
import { AddMemberDialog } from "./_components/add-member-dialog";

const ROLE_LABELS: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  moderator: "モデレーター",
  member: "メンバー",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "default",
  moderator: "secondary",
  member: "outline",
};

export default function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project } = useProject(id);
  const { user } = useAuth();
  const removeMember = useRemoveProjectMember(id);
  const [target, setTarget] = useState<ProjectMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  if (!project) return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;

  const canManage = user?.role === "owner" || user?.role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">メンバー ({project.memberCount})</h2>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            メンバーを追加
          </Button>
        )}
      </div>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead className="w-28">ロール</TableHead>
              <TableHead className="w-36">参加日</TableHead>
              {canManage && <TableHead className="w-20 text-right">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.members.map((m: ProjectMember) => {
              const isSelf = m.userId === user?.id;
              const isCreator = m.userId === project.createdBy.id;
              const canRemove = canManage && !isSelf && !isCreator;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
                        <AvatarFallback className="text-xs">{m.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANTS[m.role] ?? "outline"} className="text-[10px]">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(m.joinedAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setTarget(m)}
                          aria-label={`${m.name} を削除`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AddMemberDialog
        projectId={id}
        existingUserIds={project.members.map((m) => m.userId)}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メンバーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{target?.name}」をプロジェクトから削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMember.isPending}
              onClick={() => {
                if (!target) return;
                removeMember.mutate(target.userId, { onSuccess: () => setTarget(null) });
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
