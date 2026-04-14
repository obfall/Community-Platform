"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateSkill } from "@/hooks/skills/use-skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/select-field";

const FORMAT_OPTIONS = [
  { value: "online", label: "オンライン" },
  { value: "offline", label: "オフライン" },
  { value: "both", label: "両方" },
];
import { ArrowLeft, Loader2 } from "lucide-react";

export default function SkillNewPage() {
  const router = useRouter();
  const createSkill = useCreateSkill();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [format, setFormat] = useState("online");

  const handleSubmit = () => {
    createSkill.mutate(
      {
        title,
        description: description || undefined,
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        format,
      },
      { onSuccess: () => router.push("/skills") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/skills">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">スキル出品</h1>
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
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/skills">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={!title || !price || !durationMinutes || createSkill.isPending}
            >
              {createSkill.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              出品
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
