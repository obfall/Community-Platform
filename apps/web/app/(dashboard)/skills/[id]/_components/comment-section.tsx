"use client";

import { useState } from "react";
import {
  useSkillComments,
  useAddSkillComment,
  useDeleteSkillComment,
} from "@/hooks/skills/use-skills";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Trash2 } from "lucide-react";

export function CommentSection({ listingId }: { listingId: string }) {
  const { data: comments, isLoading } = useSkillComments(listingId);
  const addComment = useAddSkillComment();
  const deleteComment = useDeleteSkillComment();
  const [body, setBody] = useState("");

  const handleSubmit = () => {
    if (!body.trim()) return;
    addComment.mutate({ listingId, body: body.trim() }, { onSuccess: () => setBody("") });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>コメント</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="質問やコメントを入力..."
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
          <div className="py-4 text-center text-muted-foreground">読み込み中...</div>
        ) : !comments?.length ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            コメントはまだありません
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{c.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.author.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComment.mutate(c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
