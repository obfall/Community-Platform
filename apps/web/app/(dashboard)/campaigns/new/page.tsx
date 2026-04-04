"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateMailMessage, useMailTemplates } from "@/hooks/use-mail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send, Save } from "lucide-react";
import Link from "next/link";

export default function NewCampaignPage() {
  const router = useRouter();
  const createMessage = useCreateMailMessage();
  const { data: templates } = useMailTemplates();

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [templateId, setTemplateId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState("");

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    if (id === "none") {
      setTemplateId("");
      return;
    }
    const template = templates?.find((t) => t.id === id);
    if (template) {
      setSubject(template.subjectTemplate);
      setBodyHtml(template.bodyHtmlTemplate);
      setBodyText(template.bodyTextTemplate ?? "");
    }
  };

  const handleSave = (sendImmediately: boolean) => {
    createMessage.mutate(
      {
        subject,
        bodyHtml,
        bodyText: bodyText || undefined,
        targetType,
        templateId: templateId || undefined,
        scheduledAt: scheduledAt || undefined,
      },
      {
        onSuccess: (msg) => {
          if (sendImmediately) {
            router.push(`/campaigns/${msg.id}`);
          } else {
            router.push("/campaigns");
          }
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">新規メール作成</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メイン */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>メール内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>件名</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="メールの件名を入力"
                />
              </div>
              <div>
                <Label>HTML本文</Label>
                <Textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="HTML形式の本文を入力"
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>テキスト本文（オプション）</Label>
                <Textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="プレーンテキスト版を入力"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>配信設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>テンプレート</Label>
                <Select value={templateId || "none"} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="テンプレートを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">テンプレートなし</SelectItem>
                    {templates?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>配信対象</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全メンバー</SelectItem>
                    <SelectItem value="rank">ランク指定</SelectItem>
                    <SelectItem value="custom">カスタム</SelectItem>
                    <SelectItem value="event">イベント参加者</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>配信予定日時（オプション）</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleSave(false)}
              variant="outline"
              disabled={!subject || !bodyHtml || createMessage.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              下書き保存
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={!subject || !bodyHtml || createMessage.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              作成して詳細へ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
