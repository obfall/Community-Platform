"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateAlbum } from "@/hooks/use-albums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AlbumNewPage() {
  const router = useRouter();
  const createAlbum = useCreateAlbum();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    createAlbum.mutate(
      {
        title,
        description: description || undefined,
      },
      { onSuccess: () => router.push("/albums") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/albums">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">アルバム作成</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="アルバムのタイトル"
              maxLength={200}
            />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="アルバムの説明（任意）"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/albums">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!title || createAlbum.isPending}>
              {createAlbum.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              作成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
