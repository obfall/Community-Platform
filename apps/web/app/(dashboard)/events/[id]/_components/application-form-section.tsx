"use client";

import { useApplicationForm } from "@/hooks/events/use-events";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, MessageSquare, ClipboardList, Bell } from "lucide-react";
import type { FormFieldVisibility, ApplicationQuestionType } from "@/lib/api/types";

const DEFAULT_COMPLETION_MESSAGE =
  "イベントへの申込を受け付けました。当日のご参加をお待ちしております。";

interface Props {
  eventId: string;
}

const VISIBILITY_LABELS: Record<FormFieldVisibility, string> = {
  hidden: "非表示",
  optional: "任意",
  required: "必須",
};

const VISIBILITY_VARIANTS: Record<FormFieldVisibility, "secondary" | "outline" | "default"> = {
  hidden: "secondary",
  optional: "outline",
  required: "default",
};

const BASIC_FIELDS = [
  { key: "askName" as const, label: "氏名" },
  { key: "askNameKana" as const, label: "ふりがな" },
  { key: "askAffiliation" as const, label: "所属" },
  { key: "askGender" as const, label: "性別" },
  { key: "askAge" as const, label: "年齢" },
  { key: "askOccupation" as const, label: "職業" },
  { key: "askNationality" as const, label: "国籍" },
];

const QUESTION_TYPE_LABELS: Record<ApplicationQuestionType, string> = {
  text: "短文入力",
  textarea: "長文入力",
  radio: "単一選択",
  checkbox: "複数選択",
  select: "プルダウン",
};

export function ApplicationFormSection({ eventId }: Props) {
  const { data: form, isLoading } = useApplicationForm(eventId);

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        申込フォーム設定を読み込み中...
      </div>
    );
  }

  const config = form?.config;
  const questions = form?.questions ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">申込フォーム設定</h2>

      <div className="ml-1 space-y-4 border-l-2 pl-4">
        {/* 通知設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">定員達成時通知</span>
              <span>{config?.notifyOnCapacityReached ? "ON" : "OFF"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">残席閾値通知</span>
              <span>
                {config?.notifyOnRemainingThreshold != null
                  ? `残り${config.notifyOnRemainingThreshold}件で通知`
                  : "OFF"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 完了メッセージ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              申込完了メッセージ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">アプリ内通知:</span>
              <p className="mt-0.5 whitespace-pre-wrap">
                {config?.completionMessageApp || DEFAULT_COMPLETION_MESSAGE}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">メール:</span>
              <p className="mt-0.5 whitespace-pre-wrap">
                {config?.completionMessageEmail || DEFAULT_COMPLETION_MESSAGE}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* リマインダー設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              リマインダー設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">リマインダー</span>
              <span>{config?.reminderEnabled ? "ON" : "OFF"}</span>
            </div>
            {config?.reminderEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">送信タイミング</span>
                  <span>開始{config.reminderHoursBefore ?? 24}時間前</span>
                </div>
                {config.reminderMessage && (
                  <div>
                    <span className="text-muted-foreground">メッセー��:</span>
                    <p className="mt-0.5 whitespace-pre-wrap">{config.reminderMessage}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 基本属性 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              基本属性の表示設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {BASIC_FIELDS.map((field) => {
              const v: FormFieldVisibility =
                (config?.[field.key] as FormFieldVisibility | undefined) ??
                (field.key === "askName" ? "required" : "hidden");
              return (
                <div key={field.key} className="flex items-center justify-between text-sm">
                  <span>{field.label}</span>
                  <Badge variant={VISIBILITY_VARIANTS[v]} className="text-xs">
                    {VISIBILITY_LABELS[v]}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* カスタム質問 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              カスタム質問
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {questions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">カスタム質問はありません</p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{q.label}</p>
                    {q.isRequired && (
                      <Badge variant="default" className="text-xs">
                        必須
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {QUESTION_TYPE_LABELS[q.questionType]}
                    {q.options && (q.options as Array<{ label: string }>).length > 0 && (
                      <>
                        {" ・ "}
                        {(q.options as Array<{ label: string }>).map((o) => o.label).join(" / ")}
                      </>
                    )}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
