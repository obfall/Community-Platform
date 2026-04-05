"use client";

import { use, useState } from "react";
import {
  useProject,
  useProjectThreads,
  useProjectTasks,
  useCreateThread,
  useCreateTask,
  useThreadReplies,
  useCreateReply,
  useToggleThreadLike,
  useToggleReplyLike,
  useProjectBoardTopics,
  useProjectBoardTopic,
  useProjectBoardPosts,
  useCreateBoardTopic,
  useCreateBoardPost,
  useCreateBoardReply,
  useToggleBoardLike,
} from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ArrowLeft,
  Users,
  MessageSquare,
  CheckSquare,
  Plus,
  CalendarDays,
  Paperclip,
  X,
  Heart,
  Reply,
} from "lucide-react";
import { toast } from "sonner";
import { filesApi, type UploadedFile } from "@/lib/api/files";
import Link from "next/link";
import type {
  ProjectThread,
  ProjectTask,
  ProjectMember as ProjectMemberType,
} from "@/lib/api/types";

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

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">基本情報</TabsTrigger>
          <TabsTrigger value="members">メンバー</TabsTrigger>
          <TabsTrigger value="threads">メッセージ</TabsTrigger>
          <TabsTrigger value="tasks">タスク</TabsTrigger>
          <TabsTrigger value="board">掲示板</TabsTrigger>
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
          <TasksTab projectId={id} members={project.members} />
        </TabsContent>

        <TabsContent value="board" className="pt-4">
          <BoardTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ThreadsTab({ projectId }: { projectId: string }) {
  const { data } = useProjectThreads(projectId);
  const createThread = useCreateThread();
  const toggleLike = useToggleThreadLike();
  const [title, setTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  const threads = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" />
              新規メッセージ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>メッセージ作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>メッセージ</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="メッセージを入力"
                />
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
                投稿
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {threads.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">メッセージがありません</p>
      ) : (
        <div className="space-y-3">
          {threads.map((t: ProjectThread) => (
            <Card key={t.id}>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-start gap-3">
                  <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {t.createdBy.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.createdBy.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {t.isPinned && (
                        <Badge variant="secondary" className="text-[10px]">
                          固定
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm">{t.title}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleLike.mutate(t.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        {t.likeCount > 0 && t.likeCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedThread(expandedThread === t.id ? null : t.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        {t.replyCount > 0 ? `${t.replyCount}件の返信` : "返信"}
                      </button>
                    </div>
                  </div>
                </div>
                {expandedThread === t.id && <RepliesSection threadId={t.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RepliesSection({ threadId }: { threadId: string }) {
  const { data: replies } = useThreadReplies(threadId);
  const createReply = useCreateReply();
  const toggleLike = useToggleReplyLike();
  const [body, setBody] = useState("");

  return (
    <div className="ml-11 space-y-3 border-l-2 pl-4">
      {(
        replies as Array<{
          id: string;
          body: string;
          likeCount: number;
          author: { id: string; name: string; avatarUrl: string | null };
          createdAt: string;
        }>
      )?.map((r) => (
        <div key={r.id} className="flex items-start gap-2">
          <Avatar className="mt-0.5 h-6 w-6 shrink-0">
            <AvatarFallback className="text-[10px]">{r.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{r.author.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="mt-0.5 text-sm">{r.body}</p>
            <button
              type="button"
              onClick={() => toggleLike.mutate(r.id)}
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Heart className="h-3 w-3" />
              {r.likeCount > 0 && r.likeCount}
            </button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && body.trim()) {
              createReply.mutate({ threadId, body: body.trim() }, { onSuccess: () => setBody("") });
            }
          }}
          placeholder="返信を入力..."
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          onClick={() => {
            if (body.trim()) {
              createReply.mutate({ threadId, body: body.trim() }, { onSuccess: () => setBody("") });
            }
          }}
          disabled={!body.trim() || createReply.isPending}
          className="h-8"
        >
          返信
        </Button>
      </div>
    </div>
  );
}

function TasksTab({ projectId, members }: { projectId: string; members: ProjectMemberType[] }) {
  const { data: tasks } = useProjectTasks(projectId);
  const createTask = useCreateTask();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setRequestedDate("");
    setDueDate("");
    setSelectedAssignees([]);
    setUploadedFiles([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await filesApi.upload(file, "document", true);
        setUploadedFiles((prev) => [...prev, result]);
      }
    } catch {
      toast.error("ファイルのアップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleCreate = () => {
    createTask.mutate(
      {
        projectId,
        data: {
          title,
          description: description || undefined,
          requestedDate: requestedDate || undefined,
          dueDate: dueDate || undefined,
          assigneeIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
          fileIds: uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.id) : undefined,
        },
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      },
    );
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" />
              タスク追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>タスク追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>タイトル</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="タスク名"
                />
              </div>
              <div>
                <Label>概要</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="タスクの詳細を入力"
                />
              </div>
              <div>
                <Label>担当者</Label>
                <div className="mt-1 max-h-40 space-y-2 overflow-y-auto rounded border p-2">
                  {members.map((m) => (
                    <label key={m.userId} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedAssignees.includes(m.userId)}
                        onCheckedChange={() => toggleAssignee(m.userId)}
                      />
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">{m.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {m.name}
                    </label>
                  ))}
                  {members.length === 0 && (
                    <p className="text-xs text-muted-foreground">メンバーがいません</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>依頼日</Label>
                  <Input
                    type="date"
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>締切日</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>ファイル添付</Label>
                <div className="mt-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition-colors hover:bg-accent">
                    <Paperclip className="h-4 w-4" />
                    {uploading ? "アップロード中..." : "ファイルを選択"}
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedFiles.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
                      >
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="flex-1 truncate">{f.originalName}</span>
                        <button type="button" onClick={() => removeFile(f.id)}>
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={handleCreate}
                disabled={!title || createTask.isPending || uploading}
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
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {t.requestedDate && <span>依頼: {t.requestedDate}</span>}
                      {t.dueDate && <span>期限: {t.dueDate}</span>}
                      {t.assignees.length > 0 && (
                        <span className="flex items-center gap-1">
                          担当:
                          {t.assignees.map((a) => (
                            <Badge key={a.id} variant="outline" className="text-[10px]">
                              {a.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{t.progress}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 掲示板（Phase 2 と同じ構造） ==========

function BoardTab({ projectId }: { projectId: string }) {
  const { data } = useProjectBoardTopics(projectId);
  const createTopic = useCreateBoardTopic();
  const toggleLike = useToggleBoardLike();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicBody, setTopicBody] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  type TopicItem = {
    id: string;
    title: string;
    body: string;
    isPinned: boolean;
    viewCount: number;
    commentCount: number;
    likeCount: number;
    category: { id: string; name: string } | null;
    author: { id: string; name: string; avatarUrl: string | null };
    createdAt: string;
  };
  const topics = (data as { data: TopicItem[] } | undefined)?.data ?? [];

  // トピック詳細が選択されている場合はトピック詳細を表示
  if (selectedTopicId) {
    return <BoardTopicDetail topicId={selectedTopicId} onBack={() => setSelectedTopicId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" />
              新規トピック
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>トピック作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>タイトル</Label>
                <Input
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="トピックのタイトル"
                />
              </div>
              <div>
                <Label>本文</Label>
                <Textarea
                  value={topicBody}
                  onChange={(e) => setTopicBody(e.target.value)}
                  rows={6}
                  placeholder="トピックの内容"
                />
              </div>
              <Button
                onClick={() => {
                  createTopic.mutate(
                    { projectId, data: { title: topicTitle, body: topicBody } },
                    {
                      onSuccess: () => {
                        setDialogOpen(false);
                        setTopicTitle("");
                        setTopicBody("");
                      },
                    },
                  );
                }}
                disabled={!topicTitle || !topicBody || createTopic.isPending}
                className="w-full"
              >
                作成
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {topics.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">トピックがありません</p>
      ) : (
        <div className="space-y-2">
          {topics.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedTopicId(t.id)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                {t.isPinned && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    固定
                  </Badge>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.author.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {t.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {t.commentCount}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike.mutate({ targetType: "project_board_post", targetId: t.id });
                    }}
                    className="hover:text-red-500"
                  >
                    <Heart className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** トピック詳細（Phase 2 のトピック詳細ページと同じ構造） */
function BoardTopicDetail({ topicId, onBack }: { topicId: string; onBack: () => void }) {
  const { data: topic } = useProjectBoardTopic(topicId);
  const { data: postsData } = useProjectBoardPosts(topicId);
  const createPost = useCreateBoardPost();
  const createReplyMut = useCreateBoardReply();
  const toggleLike = useToggleBoardLike();
  const [postBody, setPostBody] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  type TopicData = {
    id: string;
    title: string;
    body: string;
    isPinned: boolean;
    viewCount: number;
    commentCount: number;
    likeCount: number;
    category: { id: string; name: string } | null;
    author: { id: string; name: string; avatarUrl: string | null };
    createdAt: string;
    updatedAt: string;
  };
  const t = topic as TopicData | undefined;

  type PostItem = {
    id: string;
    body: string;
    likeCount: number;
    author: { id: string; name: string; avatarUrl: string | null };
    childComments: Array<{
      id: string;
      body: string;
      likeCount: number;
      author: { id: string; name: string; avatarUrl: string | null };
      createdAt: string;
    }>;
    createdAt: string;
  };
  const posts = (postsData as { data: PostItem[] } | undefined)?.data ?? [];

  if (!t) return <p className="py-8 text-center text-sm text-muted-foreground">読み込み中...</p>;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-2 text-xs text-muted-foreground hover:text-foreground"
        >
          ← トピック一覧に戻る
        </button>
        {t.category && (
          <Badge variant="secondary" className="mb-2 ml-2">
            {t.category.name}
          </Badge>
        )}
        <h3 className="text-lg font-bold">{t.title}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">{t.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span>{t.author.name}</span>
          <span>{new Date(t.createdAt).toLocaleString("ja-JP")}</span>
        </div>
      </div>

      {/* トピック本文 */}
      <div className="whitespace-pre-wrap rounded border p-4 text-sm">{t.body}</div>

      {/* いいね・投稿数 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => toggleLike.mutate({ targetType: "project_board_post", targetId: t.id })}
          className="flex items-center gap-1 hover:text-red-500"
        >
          <Heart className="h-4 w-4" />
          {t.likeCount}
        </button>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {t.commentCount}件の投稿
        </span>
      </div>

      <Separator />

      {/* 投稿フォーム */}
      <div className="space-y-2">
        <Textarea
          value={postBody}
          onChange={(e) => setPostBody(e.target.value)}
          rows={3}
          placeholder="投稿を入力..."
        />
        <Button
          size="sm"
          onClick={() => {
            createPost.mutate({ topicId, body: postBody }, { onSuccess: () => setPostBody("") });
          }}
          disabled={!postBody.trim() || createPost.isPending}
        >
          投稿
        </Button>
      </div>

      {/* 投稿一覧 */}
      <div className="space-y-4">
        {posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-3 py-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{p.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{p.author.name}</span>
                    <span className="text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        toggleLike.mutate({ targetType: "project_board_comment", targetId: p.id })
                      }
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      {p.likeCount > 0 && p.likeCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTarget(replyTarget === p.id ? null : p.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      返信
                    </button>
                  </div>
                </div>
              </div>

              {/* ネストされた返信 */}
              {p.childComments.length > 0 && (
                <div className="ml-11 space-y-2 border-l-2 pl-4">
                  {p.childComments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {c.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{c.author.name}</span>
                          <span className="text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString("ja-JP", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                        <button
                          type="button"
                          onClick={() =>
                            toggleLike.mutate({
                              targetType: "project_board_comment",
                              targetId: c.id,
                            })
                          }
                          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500"
                        >
                          <Heart className="h-3 w-3" />
                          {c.likeCount > 0 && c.likeCount}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 返信入力欄 */}
              {replyTarget === p.id && (
                <div className="ml-11 flex gap-2 border-l-2 pl-4">
                  <Input
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && replyBody.trim()) {
                        createReplyMut.mutate(
                          { postId: p.id, body: replyBody.trim() },
                          {
                            onSuccess: () => {
                              setReplyBody("");
                              setReplyTarget(null);
                            },
                          },
                        );
                      }
                    }}
                    placeholder="返信を入力..."
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      createReplyMut.mutate(
                        { postId: p.id, body: replyBody.trim() },
                        {
                          onSuccess: () => {
                            setReplyBody("");
                            setReplyTarget(null);
                          },
                        },
                      );
                    }}
                    disabled={!replyBody.trim() || createReplyMut.isPending}
                  >
                    返信
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setReplyTarget(null);
                      setReplyBody("");
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
