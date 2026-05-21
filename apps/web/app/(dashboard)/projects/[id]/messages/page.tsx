"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Plus, Heart, MessageCircle } from "lucide-react";
import { RepliesSection } from "./_components/replies-section";
import type { ProjectThread } from "@/lib/api/types";

export default function ProjectMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const t = useTranslations("projects.messages");
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
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" />
              {t("newButton")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("inputLabel")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("inputPlaceholder")}
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
                {t("submit")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {threads.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {threads.map((th: ProjectThread) => (
            <Card key={th.id}>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-start gap-3">
                  <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {th.createdBy.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{th.createdBy.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(th.createdAt).toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {th.isPinned && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t("pinned")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm">{th.title}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => toggleLike.mutate(th.id)}
                        className={`flex items-center gap-1 ${th.isLiked ? "text-red-500" : "hover:text-red-500"}`}
                      >
                        <Heart className={`h-4 w-4 ${th.isLiked ? "fill-current" : ""}`} />
                        {th.likeCount > 0 && th.likeCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedThread(expandedThread === th.id ? null : th.id)}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {th.replyCount > 0 ? th.replyCount : t("replyButton")}
                      </button>
                    </div>
                  </div>
                </div>
                {expandedThread === th.id && <RepliesSection threadId={th.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
