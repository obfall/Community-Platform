"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateProject } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/image-upload";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = () => {
    createProject.mutate(
      {
        name,
        description: description || undefined,
        coverImageUrl: coverImageUrl || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
      { onSuccess: (project) => router.push(`/projects/${project.id}`) },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">プロジェクト作成</h1>
      </div>

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
          <Button
            onClick={handleSubmit}
            disabled={!name || createProject.isPending}
            className="w-full"
          >
            作成
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
