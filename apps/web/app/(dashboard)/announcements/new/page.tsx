"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateAnnouncement } from "@/hooks/announcements/use-announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SelectField } from "@/components/select-field";

const TARGET_AUDIENCE_OPTIONS = [
  { value: "all", label: "全員" },
  { value: "admin", label: "管理者" },
  { value: "member", label: "メンバー" },
];

export default function AnnouncementNewPage() {
  const router = useRouter();
  const createAnnouncement = useCreateAnnouncement();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState("");
  const [pinnedUntil, setPinnedUntil] = useState("");

  const handleSubmit = () => {
    createAnnouncement.mutate(
      {
        title,
        body,
        targetAudience,
        isPublished,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
        pinnedUntil: pinnedUntil ? new Date(pinnedUntil).toISOString() : undefined,
      },
      { onSuccess: () => router.push("/announcements") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/announcements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">お知らせ作成</h1>
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
            <SelectField
              value={targetAudience}
              onChange={setTargetAudience}
              options={TARGET_AUDIENCE_OPTIONS}
            />
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
            <Link href="/announcements">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={!title || !body || createAnnouncement.isPending}
            >
              {createAnnouncement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              作成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
