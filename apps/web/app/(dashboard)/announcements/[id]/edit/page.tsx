"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAnnouncement, useUpdateAnnouncement } from "@/hooks/use-announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Announcement } from "@/lib/api/types";

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AnnouncementEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useAnnouncement(id);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">お知らせが見つかりません</div>;
  }
  return <Form id={id} initial={data} />;
}

function Form({ id, initial }: { id: string; initial: Announcement }) {
  const router = useRouter();
  const updateAnnouncement = useUpdateAnnouncement();

  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [targetAudience, setTargetAudience] = useState(initial.targetAudience);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial.publishedAt));
  const [pinnedUntil, setPinnedUntil] = useState(toLocalInput(initial.pinnedUntil));

  const handleSubmit = () => {
    updateAnnouncement.mutate(
      {
        id,
        data: {
          title,
          body,
          targetAudience,
          isPublished,
          publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
          pinnedUntil: pinnedUntil ? new Date(pinnedUntil).toISOString() : undefined,
        },
      },
      { onSuccess: () => router.push(`/announcements/${id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/announcements/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">お知らせ編集</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>タイトル</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>本文</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </div>
          <div>
            <Label>対象</Label>
            <Select value={targetAudience} onValueChange={setTargetAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全員</SelectItem>
                <SelectItem value="admin">管理者</SelectItem>
                <SelectItem value="member">メンバー</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>公開する</Label>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
          <div>
            <Label>公開日時</Label>
            <Input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </div>
          <div>
            <Label>ピン留め期限</Label>
            <Input
              type="datetime-local"
              value={pinnedUntil}
              onChange={(e) => setPinnedUntil(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href={`/announcements/${id}`}>
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={!title || !body || updateAnnouncement.isPending}
            >
              {updateAnnouncement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              更新
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
