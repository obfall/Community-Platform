"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSkill, useUpdateSkill } from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/select-field";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { SkillListItem } from "@/lib/api/types";

const FORMAT_OPTIONS = [
  { value: "online", label: "オンライン" },
  { value: "offline", label: "オフライン" },
  { value: "both", label: "両方" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "公開" },
  { value: "inactive", label: "非公開" },
  { value: "draft", label: "下書き" },
];

export default function SkillEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { canEditAuthor } = useAuth();
  const { data: skill, isLoading } = useSkill(id);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (!skill) {
    return <div className="py-12 text-center text-muted-foreground">スキルが見つかりません</div>;
  }
  if (!canEditAuthor(skill.provider.id)) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        このスキルを編集する権限がありません
      </div>
    );
  }
  return <Form id={id} initial={skill} />;
}

function Form({ id, initial }: { id: string; initial: SkillListItem }) {
  const router = useRouter();
  const updateSkill = useUpdateSkill();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(String(initial.price));
  const [durationMinutes, setDurationMinutes] = useState(String(initial.durationMinutes));
  const [format, setFormat] = useState(initial.format);
  const [status, setStatus] = useState(initial.status);

  const handleSubmit = () => {
    updateSkill.mutate(
      {
        id,
        data: {
          title,
          description: description || undefined,
          price: Number(price),
          durationMinutes: Number(durationMinutes),
          format,
          status,
        },
      },
      { onSuccess: () => router.push(`/skills/${id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/skills/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">スキル編集</h1>
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
              placeholder="スキルのタイトル"
              maxLength={200}
            />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="スキルの説明（任意）"
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>料金（円）</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1000"
                min="0"
              />
            </div>
            <div>
              <Label>所要時間（分）</Label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="60"
                min="1"
              />
            </div>
            <div>
              <Label>形式</Label>
              <SelectField value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
            </div>
          </div>
          <div>
            <Label>公開状態</Label>
            <SelectField value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href={`/skills/${id}`}>
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={!title || !price || !durationMinutes || updateSkill.isPending}
            >
              {updateSkill.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              更新
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
