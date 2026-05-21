"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useThreadReplies,
  useCreateReply,
  useToggleReplyLike,
} from "@/hooks/projects/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart } from "lucide-react";

export function RepliesSection({ threadId }: { threadId: string }) {
  const t = useTranslations("projects.messages");
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
          isLiked: boolean;
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
              className={`mt-1 flex items-center gap-1 text-xs ${r.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Heart className={`h-3.5 w-3.5 ${r.isLiked ? "fill-current" : ""}`} />
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
          placeholder={t("replyPlaceholder")}
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
          {t("replySubmit")}
        </Button>
      </div>
    </div>
  );
}
