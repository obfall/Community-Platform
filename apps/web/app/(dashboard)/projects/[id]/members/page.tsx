"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useProject,
  useRemoveProjectMember,
  useUpdateProjectMemberRole,
} from "@/hooks/projects/use-projects";
import { useAuth } from "@/hooks/auth/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SelectField } from "@/components/select-field";
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

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  member: "outline",
};

export default function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("projects");
  const { data: project } = useProject(id);
  const { user } = useAuth();
  const removeMember = useRemoveProjectMember(id);
  const updateRole = useUpdateProjectMemberRole(id);
  const [target, setTarget] = useState<ProjectMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const roleOptions = [
    { value: "member", label: t("members.roles.member") },
    { value: "admin", label: t("members.roles.admin") },
  ];

  if (!project)
    return <div className="py-12 text-center text-muted-foreground">{t("members.loading")}</div>;

  // システム admin/owner、もしくは自分がこのプロジェクトの admin（ホスト）なら管理可能
  const isSystemAdmin = user?.role === "owner" || user?.role === "admin";
  const myMembership = project.members.find((m) => m.userId === user?.id);
  const canManage = isSystemAdmin || myMembership?.role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("members.title", { count: project.memberCount })}</h2>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t("members.addButton")}
          </Button>
        )}
      </div>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("members.table.name")}</TableHead>
              <TableHead className="w-28">{t("members.table.role")}</TableHead>
              <TableHead className="w-36">{t("members.table.joinedAt")}</TableHead>
              {canManage && (
                <TableHead className="w-20 text-right">{t("members.table.actions")}</TableHead>
              )}
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
                    {canManage && !isCreator ? (
                      <SelectField
                        value={m.role}
                        onChange={(v) =>
                          updateRole.mutate({ userId: m.userId, role: v as "admin" | "member" })
                        }
                        options={roleOptions}
                        className="h-8 w-28 text-xs"
                      />
                    ) : (
                      <Badge variant={ROLE_VARIANTS[m.role] ?? "outline"} className="text-[10px]">
                        {t(`members.roles.${m.role as "admin" | "member"}`)}
                      </Badge>
                    )}
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
                          aria-label={t("members.removeAriaLabel", { name: m.name })}
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
            <AlertDialogTitle>{t("confirm.deleteMemberTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.deleteMemberDescription", { name: target?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMember.isPending}
              onClick={() => {
                if (!target) return;
                removeMember.mutate(target.userId, { onSuccess: () => setTarget(null) });
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
