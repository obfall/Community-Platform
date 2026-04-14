"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useVideo,
  useUpdateVideo,
  useVideoCategories,
  useVideoSeries,
} from "@/hooks/videos/use-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";

const NONE_VALUE = "__none__";

export default function VideoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: video, isLoading } = useVideo(id);
  const { data: categories } = useVideoCategories();
  const { data: seriesList } = useVideoSeries();
  const updateVideo = useUpdateVideo();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (!video) {
    return <div className="py-12 text-center text-muted-foreground">動画が見つかりません</div>;
  }

  return (
    <VideoEditForm
      video={video}
      categories={categories}
      seriesList={seriesList}
      updateVideo={updateVideo}
      router={router}
      id={id}
    />
  );
}

function VideoEditForm({
  video,
  categories,
  seriesList,
  updateVideo,
  router,
  id,
}: {
  video: {
    title: string;
    description: string | null;
    publishStatus: string;
    category: { id: string; name: string } | null;
    series: { id: string; name: string } | null;
  };
  categories: Array<{ id: string; name: string }> | undefined;
  seriesList: Array<{ id: string; name: string }> | undefined;
  updateVideo: ReturnType<typeof useUpdateVideo>;
  router: ReturnType<typeof useRouter>;
  id: string;
}) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [publishStatus, setPublishStatus] = useState(video.publishStatus);
  const [categoryId, setCategoryId] = useState(video.category?.id ?? NONE_VALUE);
  const [seriesId, setSeriesId] = useState(video.series?.id ?? NONE_VALUE);

  const handleSubmit = () => {
    updateVideo.mutate(
      {
        id,
        data: {
          title,
          description: description || null,
          publishStatus,
          categoryId: categoryId === NONE_VALUE ? null : categoryId,
          seriesId: seriesId === NONE_VALUE ? null : seriesId,
        },
      },
      {
        onSuccess: () => router.push("/videos/manage"),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/videos/manage">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">動画編集</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="動画タイトル"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="動画の説明（任意）"
              rows={4}
            />
          </div>

          <div>
            <Label>公開状態</Label>
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>

          <div>
            <Label>カテゴリ</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>なし</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>シリーズ</Label>
            <Select value={seriesId} onValueChange={setSeriesId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>なし</SelectItem>
                {seriesList?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Link href="/videos/manage">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!title || updateVideo.isPending}>
              {updateVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
