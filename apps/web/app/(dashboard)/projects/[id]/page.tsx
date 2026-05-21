"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useProject, useDeleteProject } from "@/hooks/projects/use-projects";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarDays, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { PROJECT_STATUS_VARIANTS } from "@/lib/projects/project-status";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("projects");
  const tStatus = useTranslations("enums.projectStatus");
  const { data: project, isLoading } = useProject(id);
  const { user } = useAuth();
  const deleteProject = useDeleteProject();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // システム admin/owner、もしくは自分がこのプロジェクトの admin（ホスト）なら編集・削除可能
  const isSystemAdmin = user?.role === "owner" || user?.role === "admin";
  const myMembership = project?.members.find((m) => m.userId === user?.id);
  const canManageProject = isSystemAdmin || myMembership?.role === "admin";

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">{t("detail.loading")}</div>;
  if (!project)
    return <div className="py-12 text-center text-muted-foreground">{t("detail.notFound")}</div>;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={PROJECT_STATUS_VARIANTS[project.status] ?? "secondary"}>
              {tStatus(project.status)}
            </Badge>
            {project.category && <Badge variant="secondary">{project.category.name}</Badge>}
            {project.tags?.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("list.creator", { name: project.createdBy.name })}
          </p>
        </div>
        {canManageProject && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/projects/${id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("detail.menu.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("detail.menu.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* カバー画像 */}
      <div className="h-80 overflow-hidden rounded-lg bg-muted md:h-96">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.coverImageUrl ?? "/images/project-placeholder.svg"}
          alt={project.name}
          className="h-full w-full object-cover"
        />
      </div>

      {/* 詳細情報 */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {project.description && (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
              {project.description}
            </div>
          )}
          <div className="space-y-2 text-sm">
            {project.startDate && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  {t("list.period", {
                    range:
                      new Date(project.startDate).toLocaleDateString("ja-JP") +
                      (project.endDate
                        ? ` 〜 ${new Date(project.endDate).toLocaleDateString("ja-JP")}`
                        : ""),
                  })}
                </span>
              </div>
            )}
            {project.event && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">{t("detail.relatedEvent")}</span>
                {project.event.title}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm.deleteProjectTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.deleteProjectDescription", { name: project.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteProject.mutate(id, { onSuccess: () => router.push("/projects") })
              }
              disabled={deleteProject.isPending}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
