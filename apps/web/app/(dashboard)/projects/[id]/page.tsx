"use client";

import { use } from "react";
import { useProject } from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, CheckSquare, CalendarDays, Pencil } from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  completed: "完了",
  cancelled: "中止",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

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
            {project.category && <Badge variant="outline">{project.category.name}</Badge>}
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
          <Link href={`/projects/${id}`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-4 w-4" />
              編集
            </Button>
          </Link>
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

      {/* 概要 */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>概要</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {project.description}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 詳細情報 */}
      <Card>
        <CardContent className="space-y-2 pt-6 text-sm">
          {project.startDate && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>
                期間: {project.startDate}
                {project.endDate && ` 〜 ${project.endDate}`}
              </span>
            </div>
          )}
          {project.event && <p>関連イベント: {project.event.title}</p>}
          {project.inviteLinkEnabled && (
            <p className="text-xs text-muted-foreground">
              招待リンク: /projects/join/{project.inviteToken}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
