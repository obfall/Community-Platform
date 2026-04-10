"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateMemo, useMemoCategories } from "@/hooks/memo/use-memo";
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
import { FileUploadList, type UploadedFileItem } from "@/components/file-upload-list";

export default function MemoNewPage() {
  const router = useRouter();
  const createMemo = useCreateMemo();
  const { data: categories } = useMemoCategories();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [files, setFiles] = useState<UploadedFileItem[]>([]);

  const handleSubmit = () => {
    createMemo.mutate(
      {
        title,
        description: description || undefined,
        categoryId,
        attachmentFileIds: files.map((f) => f.fileId),
      },
      { onSuccess: () => router.push("/memo") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/memo">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">メモ作成</h1>
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
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
            />
          </div>
          <div>
            <Label>カテゴリ</Label>
            <Select
              value={categoryId ?? "none"}
              onValueChange={(v) => setCategoryId(v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未分類</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>添付ファイル</Label>
            <FileUploadList value={files} onChange={setFiles} fileCategory="general" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/memo">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!title || createMemo.isPending}>
              {createMemo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              作成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
