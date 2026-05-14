"use client";

import { useState, useImperativeHandle, type Ref } from "react";
import { toast } from "sonner";
import {
  useApplicationForm,
  useUpsertApplicationFormConfig,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
} from "@/hooks/events/use-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  MessageSquare,
  ClipboardList,
  Bell,
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type {
  FormFieldVisibility,
  ApplicationQuestionType,
  ApplicationQuestionOption,
} from "@/lib/api/types";

export interface ApplicationFormEditorHandle {
  isDirty: boolean;
  save: () => void;
  isPending: boolean;
}

interface Props {
  eventId: string;
  handleRef?: Ref<ApplicationFormEditorHandle>;
}

const DEFAULT_COMPLETION_MESSAGE_APP =
  "イベントへの申込を受け付けました。当日のご参加をお待ちしております。";
const DEFAULT_COMPLETION_MESSAGE_EMAIL =
  "イベントへの申込を受け付けました。当日のご参加をお待ちしております。";
const DEFAULT_REMINDER_MESSAGE =
  "イベントの開催が近づいています。当日のご参加をお待ちしております。";

const VISIBILITY_LABELS: Record<FormFieldVisibility, string> = {
  hidden: "非表示",
  optional: "任意",
  required: "必須",
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

type BasicFieldKey = (typeof BASIC_FIELDS)[number]["key"];

function getDefaultBasicState(
  config: Record<string, unknown> | null | undefined,
): Record<string, FormFieldVisibility> {
  const state: Record<string, FormFieldVisibility> = {};
  for (const f of BASIC_FIELDS) {
    state[f.key] =
      (config?.[f.key] as FormFieldVisibility | undefined) ??
      (f.key === "askName" ? "required" : "hidden");
  }
  return state;
}

export function ApplicationFormEditor({ eventId, handleRef }: Props) {
  const { data: form, isLoading } = useApplicationForm(eventId);
  const upsertConfig = useUpsertApplicationFormConfig();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const reorderQuestions = useReorderQuestions();

  // --- config state ---
  const [notifyCapacity, setNotifyCapacity] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [msgApp, setMsgApp] = useState("");
  const [msgEmail, setMsgEmail] = useState("");
  const [basicFieldState, setBasicFieldState] = useState<Record<string, FormFieldVisibility>>({});
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHours, setReminderHours] = useState("24");
  const [reminderMessage, setReminderMessage] = useState("");
  const [initialized, setInitialized] = useState(false);

  // --- question dialog state ---
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qLabel, setQLabel] = useState("");
  const [qDescription, setQDescription] = useState("");
  const [qType, setQType] = useState<ApplicationQuestionType>("text");
  const [qRequired, setQRequired] = useState(false);
  const [qOptions, setQOptions] = useState<ApplicationQuestionOption[]>([{ value: "", label: "" }]);

  // --- initialize from server data ---
  if (form && !initialized) {
    setNotifyCapacity(form.config?.notifyOnCapacityReached ?? false);
    setThreshold(form.config?.notifyOnRemainingThreshold?.toString() ?? "");
    setMsgApp(form.config?.completionMessageApp ?? DEFAULT_COMPLETION_MESSAGE_APP);
    setMsgEmail(form.config?.completionMessageEmail ?? DEFAULT_COMPLETION_MESSAGE_EMAIL);
    setBasicFieldState(getDefaultBasicState(form.config as Record<string, unknown> | null));
    setReminderEnabled(form.config?.reminderEnabled ?? false);
    setReminderHours(form.config?.reminderHoursBefore?.toString() ?? "24");
    setReminderMessage(form.config?.reminderMessage ?? DEFAULT_REMINDER_MESSAGE);
    setInitialized(true);
  }

  // --- dirty check ---
  const serverNotifyCapacity = form?.config?.notifyOnCapacityReached ?? false;
  const serverThreshold = form?.config?.notifyOnRemainingThreshold?.toString() ?? "";
  const serverMsgApp = form?.config?.completionMessageApp ?? DEFAULT_COMPLETION_MESSAGE_APP;
  const serverMsgEmail = form?.config?.completionMessageEmail ?? DEFAULT_COMPLETION_MESSAGE_EMAIL;
  const serverBasicState = getDefaultBasicState(form?.config as Record<string, unknown> | null);
  const serverReminderEnabled = form?.config?.reminderEnabled ?? false;
  const serverReminderHours = form?.config?.reminderHoursBefore?.toString() ?? "24";
  const serverReminderMessage = form?.config?.reminderMessage ?? DEFAULT_REMINDER_MESSAGE;

  const isDirty =
    initialized &&
    (notifyCapacity !== serverNotifyCapacity ||
      threshold !== serverThreshold ||
      msgApp !== serverMsgApp ||
      msgEmail !== serverMsgEmail ||
      reminderEnabled !== serverReminderEnabled ||
      reminderHours !== serverReminderHours ||
      reminderMessage !== serverReminderMessage ||
      BASIC_FIELDS.some((f) => basicFieldState[f.key] !== serverBasicState[f.key]));

  const handleSaveAll = () => {
    if (!isDirty) return;
    upsertConfig.mutate({
      eventId,
      data: {
        notifyOnCapacityReached: notifyCapacity,
        notifyOnRemainingThreshold: threshold ? parseInt(threshold, 10) : null,
        completionMessageApp: msgApp || null,
        completionMessageEmail: msgEmail || null,
        ...(basicFieldState as Record<BasicFieldKey, FormFieldVisibility>),
        reminderEnabled,
        reminderHoursBefore: parseInt(reminderHours, 10) || 24,
        reminderMessage: reminderMessage || null,
      },
    });
  };

  useImperativeHandle(handleRef, () => ({
    isDirty,
    save: handleSaveAll,
    isPending: upsertConfig.isPending,
  }));

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        申込フォーム設定を読み込み中...
      </div>
    );
  }

  // --- question handlers ---
  const openNewQuestion = () => {
    setEditingQuestionId(null);
    setQLabel("");
    setQDescription("");
    setQType("text");
    setQRequired(false);
    setQOptions([{ value: "", label: "" }]);
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: {
    id: string;
    label: string;
    description: string | null;
    questionType: ApplicationQuestionType;
    isRequired: boolean;
    options: ApplicationQuestionOption[] | null;
  }) => {
    setEditingQuestionId(q.id);
    setQLabel(q.label);
    setQDescription(q.description ?? "");
    setQType(q.questionType);
    setQRequired(q.isRequired);
    setQOptions(q.options && q.options.length > 0 ? q.options : [{ value: "", label: "" }]);
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = () => {
    const hasOptions = qType === "radio" || qType === "checkbox" || qType === "select";
    let options: ApplicationQuestionOption[] | undefined;
    if (hasOptions) {
      // 値・ラベルの trim と必須チェック
      const trimmed = qOptions.map((o) => ({
        value: o.value.trim(),
        label: o.label.trim(),
      }));
      if (trimmed.some((o) => !o.value || !o.label)) {
        toast.error("選択肢の「値」「ラベル」は両方とも入力してください");
        return;
      }
      // value 重複チェック（apply 画面で同 value 同士が同時選択される不具合を防ぐ）
      const values = trimmed.map((o) => o.value);
      if (new Set(values).size !== values.length) {
        toast.error("選択肢の「値」が重複しています。一意の値を指定してください");
        return;
      }
      options = trimmed;
    }

    if (editingQuestionId) {
      updateQuestion.mutate(
        {
          eventId,
          questionId: editingQuestionId,
          data: {
            label: qLabel,
            description: qDescription || undefined,
            questionType: qType,
            isRequired: qRequired,
            options,
          },
        },
        { onSuccess: () => setQuestionDialogOpen(false) },
      );
    } else {
      createQuestion.mutate(
        {
          eventId,
          data: {
            label: qLabel,
            description: qDescription || undefined,
            questionType: qType,
            isRequired: qRequired,
            options,
          },
        },
        { onSuccess: () => setQuestionDialogOpen(false) },
      );
    }
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const questions = form?.questions ?? [];
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    )
      return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const items = questions.map((q, i) => {
      if (i === index) return { id: q.id, sortOrder: questions[swapIndex]!.sortOrder };
      if (i === swapIndex) return { id: q.id, sortOrder: questions[index]!.sortOrder };
      return { id: q.id, sortOrder: q.sortOrder };
    });

    reorderQuestions.mutate({ eventId, items });
  };

  const questions = form?.questions ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>申込フォーム設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 通知設定 */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">通知設定</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-capacity"
                  checked={notifyCapacity}
                  onCheckedChange={(v) => setNotifyCapacity(!!v)}
                />
                <Label htmlFor="notify-capacity">定員達成時に通知する</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0">残席</Label>
                <Input
                  type="number"
                  className="w-24"
                  min="1"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="—"
                />
                <Label className="shrink-0">件を下回ったら通知する</Label>
              </div>
            </div>
          </section>

          <Separator />

          {/* 完了メッセージ */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">申込完了メッセージ</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>アプリ内通知メッセージ</Label>
                <Textarea
                  value={msgApp}
                  onChange={(e) => setMsgApp(e.target.value)}
                  placeholder="申込完了時に申込者へ送るメッセージ"
                />
              </div>
              <div>
                <Label>メール本文</Label>
                <Textarea
                  value={msgEmail}
                  onChange={(e) => setMsgEmail(e.target.value)}
                  placeholder="申込完了時に申込者へ送るメール本文"
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* リマインダー設定 */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">リマインダー設定</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reminder-enabled"
                  checked={reminderEnabled}
                  onCheckedChange={(v) => setReminderEnabled(!!v)}
                />
                <Label htmlFor="reminder-enabled">リマインダーを送信する</Label>
              </div>
              {reminderEnabled && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="shrink-0">開始</Label>
                    <Input
                      type="number"
                      className="w-20"
                      min="1"
                      max="168"
                      value={reminderHours}
                      onChange={(e) => setReminderHours(e.target.value)}
                    />
                    <Label className="shrink-0">時間前に送信</Label>
                  </div>
                  <div>
                    <Label>リマインダーメッセージ（任意）</Label>
                    <Textarea
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value)}
                      placeholder="未入力の場合、デフォルトメッセージが使用されます"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          <Separator />

          {/* 基本属性 */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">基本属性の表示設定</p>
            </div>
            <div className="space-y-3">
              {BASIC_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between">
                  <span className="text-sm">{field.label}</span>
                  <div className="flex gap-1">
                    {(["hidden", "optional", "required"] as FormFieldVisibility[]).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={basicFieldState[field.key] === v ? "default" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() => setBasicFieldState((prev) => ({ ...prev, [field.key]: v }))}
                      >
                        {VISIBILITY_LABELS[v]}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* カスタム質問 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">カスタム質問</p>
              </div>
              <Button size="sm" variant="outline" onClick={openNewQuestion}>
                <Plus className="mr-1 h-3 w-3" />
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {questions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  カスタム質問はありません
                </p>
              ) : (
                questions.map((q, i) => (
                  <div key={q.id} className="flex items-center justify-between rounded border p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{q.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {QUESTION_TYPE_LABELS[q.questionType]}
                        {q.isRequired && " ・ 必須"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() => handleMoveQuestion(i, "up")}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === questions.length - 1}
                        onClick={() => handleMoveQuestion(i, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditQuestion(q)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteQuestion.mutate({ eventId, questionId: q.id })}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </CardContent>
      </Card>

      {/* 質問編集ダイアログ */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuestionId ? "質問を編集" : "質問を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ラベル</Label>
              <Input
                value={qLabel}
                onChange={(e) => setQLabel(e.target.value)}
                placeholder="質問文"
              />
            </div>
            <div>
              <Label>補足説明（任意）</Label>
              <Input value={qDescription} onChange={(e) => setQDescription(e.target.value)} />
            </div>
            <div>
              <Label>タイプ</Label>
              <Select value={qType} onValueChange={(v) => setQType(v as ApplicationQuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(QUESTION_TYPE_LABELS) as [ApplicationQuestionType, string][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(qType === "radio" || qType === "checkbox" || qType === "select") && (
              <div className="space-y-2">
                <Label>選択肢</Label>
                {qOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="値"
                      value={opt.value}
                      onChange={(e) => {
                        const next = [...qOptions];
                        next[i] = { ...opt, value: e.target.value };
                        setQOptions(next);
                      }}
                    />
                    <Input
                      className="flex-1"
                      placeholder="ラベル"
                      value={opt.label}
                      onChange={(e) => {
                        const next = [...qOptions];
                        next[i] = { ...opt, label: e.target.value };
                        setQOptions(next);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setQOptions(qOptions.filter((_, j) => j !== i))}
                      disabled={qOptions.length <= 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQOptions([...qOptions, { value: "", label: "" }])}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  選択肢を追加
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="q-required"
                checked={qRequired}
                onCheckedChange={(v) => setQRequired(!!v)}
              />
              <Label htmlFor="q-required">必須</Label>
            </div>
            <Button
              onClick={handleSaveQuestion}
              disabled={!qLabel || createQuestion.isPending || updateQuestion.isPending}
              className="w-full"
            >
              {editingQuestionId ? "更新" : "追加"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
