"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  useSkill,
  useCreateBooking,
  useSkillComments,
  useAddSkillComment,
  useDeleteSkillComment,
} from "@/hooks/use-skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Clock, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

const FORMAT_LABELS: Record<string, string> = {
  online: "オンライン",
  offline: "オフライン",
  both: "両方",
};

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: skill, isLoading } = useSkill(id);
  const createBooking = useCreateBooking();
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const handleBook = () => {
    createBooking.mutate(
      {
        listingId: id,
        data: { message: message || undefined, scheduledAt: scheduledAt || undefined },
      },
      {
        onSuccess: () => {
          setMessage("");
          setScheduledAt("");
          toast.success("予約リクエストを送信しました");
        },
      },
    );
  };

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!skill)
    return <div className="py-12 text-center text-muted-foreground">スキルが見つかりません</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/skills">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{skill.title}</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline">{FORMAT_LABELS[skill.format] ?? skill.format}</Badge>
            {skill.category && <Badge variant="secondary">{skill.category.name}</Badge>}
          </div>

          <div className="mb-4 flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{skill.provider.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{skill.provider.name}</div>
              <div className="text-sm text-muted-foreground">提供者</div>
            </div>
          </div>

          {skill.description && (
            <div className="mb-4 whitespace-pre-wrap text-sm">{skill.description}</div>
          )}

          <div className="flex items-center gap-6 border-t pt-4">
            <div>
              <div className="text-2xl font-bold">¥{skill.price.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">料金</div>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{skill.durationMinutes}分</div>
                <div className="text-xs text-muted-foreground">所要時間</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>予約リクエスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>希望日時</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div>
            <Label>メッセージ</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="提供者へのメッセージ（任意）"
              rows={3}
            />
          </div>
          <Button onClick={handleBook} disabled={createBooking.isPending} className="w-full">
            {createBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            予約リクエストを送信
          </Button>
        </CardContent>
      </Card>

      <CommentSection listingId={id} />
    </div>
  );
}

function CommentSection({ listingId }: { listingId: string }) {
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
