"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSkill, useCreateBooking } from "@/hooks/skills/use-skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CommentSection } from "./_components/comment-section";

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
