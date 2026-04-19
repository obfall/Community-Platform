"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Users,
  MessageSquare,
  CheckSquare,
  CalendarDays,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  not_started: "開始前",
  in_progress: "進行中",
  completed: "終了",
  cancelled: "中止",
};

const PUBLISH_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
  unpublished: "非公開",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: project, isLoading } = useProject(id);
  const { user } = useAuth();
  const deleteProject = useDeleteProject();
  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!project)
    return (
      <div className="py-12 text-center text-muted-foreground">プロジェクトが見つかりません</div>
    );

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge>{STATUS_LABELS[project.status] ?? project.status}</Badge>
            <Badge variant="outline">
              {PUBLISH_STATUS_LABELS[project.publishStatus] ?? project.publishStatus}
            </Badge>
            {project.category && <Badge variant="secondary">{project.category.name}</Badge>}
            {project.tags?.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">作成者: {project.createdBy.name}</p>
        </div>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/projects/${id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {project.coverImageUrl && (
        <div className="h-48 overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.coverImageUrl}
            alt={project.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* 統計 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{project.memberCount}</p>
              <p className="text-xs text-muted-foreground">メンバー</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{project.threadCount}</p>
              <p className="text-xs text-muted-foreground">メッセージ</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{project.taskCount}</p>
              <p className="text-xs text-muted-foreground">タスク</p>
            </div>
          </CardContent>
        </Card>
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
                  期間: {new Date(project.startDate).toLocaleDateString("ja-JP")}
                  {project.endDate &&
                    ` 〜 ${new Date(project.endDate).toLocaleDateString("ja-JP")}`}
                </span>
              </div>
            )}
            {project.event && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">関連イベント:</span>
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
            <AlertDialogTitle>プロジェクトを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{project.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteProject.mutate(id, { onSuccess: () => router.push("/projects") })
              }
              disabled={deleteProject.isPending}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
