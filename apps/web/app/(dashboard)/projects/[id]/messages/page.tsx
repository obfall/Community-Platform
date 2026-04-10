"use client";

import { use, useState } from "react";
import {
  useProjectThreads,
  useCreateThread,
  useToggleThreadLike,
} from "@/hooks/projects/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Heart, Reply } from "lucide-react";
import { RepliesSection } from "./_components/replies-section";
import type { ProjectThread } from "@/lib/api/types";

export default function ProjectMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data } = useProjectThreads(projectId);
  const createThread = useCreateThread();
  const toggleLike = useToggleThreadLike();
  const [title, setTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  const threads = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">メッセージ</h2>
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
