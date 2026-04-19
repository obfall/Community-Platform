"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProject, useUpdateProject } from "@/hooks/projects/use-projects";
import { useEvents } from "@/hooks/events/use-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField, NONE_VALUE } from "@/components/select-field";
import { ImageUpload } from "@/components/image-upload";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { ArrowLeft, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "not_started", label: "開始前" },
  { value: "in_progress", label: "進行中" },
  { value: "completed", label: "終了" },
  { value: "cancelled", label: "中止" },
];

export default function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!project)
    return (
      <div className="py-12 text-center text-muted-foreground">プロジェクトが見つかりません</div>
    );

  return <ProjectEditForm id={id} project={project} />;
}

function ProjectEditForm({
  id,
  project,
}: {
  id: string;
  project: NonNullable<ReturnType<typeof useProject>["data"]>;
}) {
  const router = useRouter();
  const updateProject = useUpdateProject();
  const { data: eventsData } = useEvents({ limit: 100, page: 1 });
  const events = eventsData?.data ?? [];

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(project.coverImageUrl ?? null);
  const [startDate, setStartDate] = useState(
    project.startDate ? String(project.startDate).slice(0, 10) : "",
  );
  const [endDate, setEndDate] = useState(
    project.endDate ? String(project.endDate).slice(0, 10) : "",
  );
  const [status, setStatus] = useState(project.status);
  const [publishStatus, setPublishStatus] = useState(project.publishStatus);
  const [eventId, setEventId] = useState(project.event?.id ?? NONE_VALUE);

  const handleSubmit = () => {
    updateProject.mutate(
      {
        id,
        data: {
          name,
          description: description || undefined,
          coverImageUrl: coverImageUrl ?? undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: status as any,
          publishStatus,
          eventId: eventId === NONE_VALUE ? undefined : eventId,
        },
      },
      { onSuccess: () => router.push(`/projects/${id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">プロジェクト編集</h1>
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>プロジェクト名</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="プロジェクト名を入力"
            />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="プロジェクトの説明"
            />
          </div>
          <div>
            <Label>カバー画像</Label>
            <ImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>開始日</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>終了日</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>関連イベント（任意）</Label>
            <SelectField
              value={eventId}
              onChange={setEventId}
              options={events.map((e) => ({ value: e.id, label: e.title }))}
              includeNone
              placeholder="イベントを選択"
            />
          </div>
        </CardContent>
      </Card>

      {/* ステータス・公開設定 */}
      <Card>
        <CardHeader>
          <CardTitle>ステータス・公開設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>状況</Label>
            <SelectField value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>
          <div>
            <Label>公開状態</Label>
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-2">
        <Link href={`/projects/${id}`}>
          <Button variant="outline">キャンセル</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={!name || updateProject.isPending}>
          {updateProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存
        </Button>
      </div>
    </div>
  );
}
