"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useSkillComments,
  useAddSkillComment,
  useDeleteSkillComment,
} from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Trash2 } from "lucide-react";

export function CommentSection({
  listingId,
  providerId,
}: {
  listingId: string;
  providerId: string;
}) {
  const t = useTranslations("skills.comments");
  const { user } = useAuth();
  const { data: comments, isLoading } = useSkillComments(listingId);
  const addComment = useAddSkillComment();
  const deleteComment = useDeleteSkillComment();
  const [body, setBody] = useState("");
  const isProvider = user?.id === providerId;

  const handleSubmit = () => {
    if (!body.trim()) return;
    addComment.mutate({ listingId, body: body.trim() }, { onSuccess: () => setBody("") });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("placeholder")}
            rows={2}
            className="flex-1"
          />
          <Button
            onClick={handleSubmit}
            disabled={!body.trim() || addComment.isPending}
            size="icon"
            className="mt-auto h-9 w-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">{t("loading")}</div>
        ) : !comments?.length ? (
          <div className="py-4 text-center text-sm text-muted-foreground">{t("empty")}</div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {c.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {c.author.name} ・{" "}
                      {new Date(c.createdAt).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {(isProvider || user?.id === c.author.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteComment.mutate(c.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-1 rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                    {c.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
