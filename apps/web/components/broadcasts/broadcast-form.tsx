"use client";

import { useState, type ReactNode } from "react";
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
import { ChannelSelector } from "./channel-selector";
import { Send } from "lucide-react";
import type { BroadcastChannel, BroadcastTemplate, CreateBroadcastInput } from "@/lib/api/types";

export interface BroadcastFormInitial {
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  channels?: BroadcastChannel[];
}

interface Props {
  templates?: BroadcastTemplate[];
  audienceSelector: ReactNode;
  initial?: BroadcastFormInitial;
  onSubmit: (data: Omit<CreateBroadcastInput, "scope" | "targetType" | "targetFilter">) => void;
  isSubmitting?: boolean;
}

/**
 * 配信フォーム（グローバル / イベント 共用）。
 * scope, targetType, targetFilter はページ側で補完してから onSubmit を呼ぶ前提。
 */
export function BroadcastForm({
  templates,
  audienceSelector,
  initial,
  onSubmit,
  isSubmitting,
}: Props) {
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "");
  const [bodyText, setBodyText] = useState(initial?.bodyText ?? "");
  const [channels, setChannels] = useState<BroadcastChannel[]>(initial?.channels ?? ["in_app"]);
  const [templateId, setTemplateId] = useState<string>("");

  const handleTemplateSelect = (id: string) => {
    if (id === "none") {
      setTemplateId("");
      return;
    }
    setTemplateId(id);
    const template = templates?.find((t) => t.id === id);
    if (template) {
      setSubject(template.subjectTemplate);
      setBodyHtml(template.bodyHtmlTemplate);
      setBodyText(template.bodyTextTemplate ?? "");
    }
  };

  const requiresHtml = channels.includes("email");
  const canSubmit =
    subject.trim().length > 0 &&
    channels.length > 0 &&
    (requiresHtml ? bodyHtml.trim().length > 0 : bodyText.trim().length > 0);

  const handleSubmit = () => {
    onSubmit({
      subject,
      bodyHtml: requiresHtml ? bodyHtml : "",
      bodyText: bodyText || undefined,
      channels,
      templateId: templateId || undefined,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>配信内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>件名</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="配信の件名を入力"
              />
            </div>
            {requiresHtml && (
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
            )}
            <div>
              <Label>{requiresHtml ? "テキスト本文（オプション）" : "本文"}</Label>
              <Textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder={requiresHtml ? "プレーンテキスト版を入力" : "本文を入力"}
                rows={requiresHtml ? 6 : 12}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>配信設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChannelSelector value={channels} onChange={setChannels} />

            {templates && templates.length > 0 && (
              <div>
                <Label>テンプレート</Label>
                <Select value={templateId || "none"} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="テンプレートを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">テンプレートなし</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {audienceSelector}
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="w-full">
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting ? "送信中..." : "配信を作成・送信"}
        </Button>
      </div>
    </div>
  );
}
