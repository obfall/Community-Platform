"use client";

import { use, useState } from "react";
import {
  useProject,
  useProjectThreads,
  useProjectTasks,
  useCreateThread,
  useCreateTask,
} from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, MessageSquare, CheckSquare, Plus, CalendarDays } from "lucide-react";
import Link from "next/link";
import type { ProjectThread, ProjectTask } from "@/lib/api/types";

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
      <div className="flex items-start gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge>{STATUS_LABELS[project.status] ?? project.status}</Badge>
            {project.category && <Badge variant="outline">{project.category.name}</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">作成者: {project.createdBy.name}</p>
        </div>
        {isAdmin && (
          <Link href={`/projects/${id}`}>
            <Button variant="outline" size="sm">
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
              <p className="text-xs text-muted-foreground">スレッド</p>
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

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">基本情報</TabsTrigger>
          <TabsTrigger value="members">メンバー</TabsTrigger>
          <TabsTrigger value="threads">スレッド</TabsTrigger>
          <TabsTrigger value="tasks">タスク</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 pt-4">
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
        </TabsContent>

        <TabsContent value="members" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {project.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{m.name}</span>
                    <Badge variant="outline" className="ml-auto">
                      {m.role === "admin" ? "管理者" : "メンバー"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threads" className="pt-4">
          <ThreadsTab projectId={id} />
        </TabsContent>

        <TabsContent value="tasks" className="pt-4">
          <TasksTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ThreadsTab({ projectId }: { projectId: string }) {
  const { data } = useProjectThreads(projectId);
  const createThread = useCreateThread();
  const [title, setTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const threads = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" />
              新規スレッド
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>スレッド作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>タイトル</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <Button
                onClick={() => {
                  createThread.mutate(
                    { projectId, title },
                    {
                      onSuccess: () => {
                        setDialogOpen(false);
                        setTitle("");
                      },
                    },
                  );
                }}
                disabled={!title || createThread.isPending}
                className="w-full"
              >
                作成
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {threads.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">スレッドがありません</p>
      ) : (
        <div className="space-y-2">
          {threads.map((t: ProjectThread) => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3 py-3">
                {t.isPinned && <Badge variant="secondary">固定</Badge>}
                <span className="text-sm font-medium">{t.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {t.replyCount}件の返信
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TasksTab({ projectId }: { projectId: string }) {
  const { data: tasks } = useProjectTasks(projectId);
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" />
              タスク追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>タスク追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>タイトル</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <Button
                onClick={() => {
                  createTask.mutate(
                    { projectId, data: { title } },
                    {
                      onSuccess: () => {
                        setDialogOpen(false);
                        setTitle("");
                      },
                    },
                  );
                }}
                disabled={!title || createTask.isPending}
                className="w-full"
              >
                追加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {!tasks?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">タスクがありません</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: ProjectTask) => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.dueDate && <p className="text-xs text-muted-foreground">期限: {t.dueDate}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${t.progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{t.progress}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
