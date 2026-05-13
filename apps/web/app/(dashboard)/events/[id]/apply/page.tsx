"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEvent, useApplicationFormPublic, useParticipate } from "@/hooks/events/use-events";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMyProfile } from "@/hooks/profile/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { EventStatus } from "@community-platform/shared";
import type {
  FormFieldVisibility,
  ApplicationQuestion,
  ApplicationQuestionOption,
  EventDetail,
  ApplicationFormPublic,
  UserDetail,
} from "@/lib/api/types";

interface FormData {
  ticketId: string;
  quantity: number;
  discountCode: string;
  applicantEmail: string;
  applicantEmailConfirm: string;
  applicantName: string;
  applicantNameKana: string;
  applicantAffiliation: string;
  applicantGender: string;
  applicantAge: string;
  applicantOccupation: string;
  applicantNationality: string;
  answers: Record<string, string | string[]>;
  agreePolicy: boolean;
}

const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "prefer_not_to_say", label: "回答しない" },
];

const OCCUPATION_LABELS: Record<string, string> = {
  company_employee: "会社員",
  student: "学生",
  self_employed: "自営業",
  homemaker: "主婦",
  unemployed: "無職",
  other: "その他",
};

function calcAge(birthday: string): number | null {
  // "1990-05-15T00:00:00.000Z" → タイムゾーン差で日付がずれないよう日付部分のみ使う
  const dateStr = birthday.includes("T") ? birthday.split("T")[0]! : birthday;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number) as [number, number, number];
  if (!y || !m || !d) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const mDiff = today.getMonth() + 1 - m;
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) age--;
  return age >= 0 ? age : null;
}

export default function EventApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: formPublic, isLoading: formLoading } = useApplicationFormPublic(id);
  const { data: myProfile, isLoading: profileLoading } = useMyProfile();

  if (authLoading || eventLoading || formLoading || profileLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  return (
    <EventApplyForm
      id={id}
      event={event ?? null}
      formPublic={formPublic ?? null}
      user={user}
      myProfile={myProfile ?? null}
    />
  );
}

function EventApplyForm({
  id,
  event,
  formPublic,
  user,
  myProfile,
}: {
  id: string;
  event: EventDetail | null;
  formPublic: ApplicationFormPublic | null;
  user: { id: string; name: string; email: string; role: string } | null;
  myProfile: UserDetail | null;
}) {
  const router = useRouter();
  const participate = useParticipate();
  const tApply = useTranslations("events.apply");

  const [step, setStep] = useState<"input" | "confirm">("input");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>(() => ({
    ticketId: "",
    quantity: 1,
    discountCode: "",
    applicantEmail: user?.email ?? "",
    applicantEmailConfirm: user?.email ?? "",
    applicantName: user?.name ?? "",
    applicantNameKana: myProfile?.profile?.nameKana ?? "",
    applicantAffiliation: myProfile?.affiliations?.[0]?.organizationName ?? "",
    applicantGender: myProfile?.profile?.gender ?? "",
    applicantAge: myProfile?.profile?.birthday
      ? (calcAge(myProfile.profile.birthday)?.toString() ?? "")
      : "",
    applicantOccupation: myProfile?.profile?.occupation
      ? (OCCUPATION_LABELS[myProfile.profile.occupation] ?? myProfile.profile.occupation)
      : "",
    applicantNationality: myProfile?.profile?.countryOfOrigin ?? "",
    answers: {},
    agreePolicy: false,
  }));

  if (!event) {
    return <div className="py-12 text-center text-muted-foreground">{tApply("notFound")}</div>;
  }

  if (event.status !== EventStatus.RECRUITING) {
    return <div className="py-12 text-center text-muted-foreground">{tApply("notRecruiting")}</div>;
  }

  const config = formPublic?.config;
  const questions = formPublic?.questions ?? [];

  const isVisible = (v: FormFieldVisibility | undefined) => v && v !== "hidden";
  const isRequired = (v: FormFieldVisibility | undefined) => v === "required";

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const setAnswer = (qId: string, value: string | string[]) =>
    setFormData((prev) => ({
      ...prev,
      answers: { ...prev.answers, [qId]: value },
    }));

  const toggleCheckboxAnswer = (qId: string, optValue: string) => {
    setFormData((prev) => {
      const current = (prev.answers[qId] as string[]) ?? [];
      const next = current.includes(optValue)
        ? current.filter((v) => v !== optValue)
        : [...current, optValue];
      return { ...prev, answers: { ...prev.answers, [qId]: next } };
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.ticketId) errs.ticketId = "チケットを選択してください";
    if (!formData.applicantEmail) errs.applicantEmail = "メールアドレスは必須です";
    if (formData.applicantEmail !== formData.applicantEmailConfirm)
      errs.applicantEmailConfirm = "メールアドレスが一致しません";

    if (isRequired(config?.askName) && !formData.applicantName)
      errs.applicantName = "氏名は必須です";
    if (isRequired(config?.askNameKana) && !formData.applicantNameKana)
      errs.applicantNameKana = "ふりがなは必須です";
    if (isRequired(config?.askAffiliation) && !formData.applicantAffiliation)
      errs.applicantAffiliation = "所属は必須です";
    if (isRequired(config?.askGender) && !formData.applicantGender)
      errs.applicantGender = "性別は必須です";
    if (isRequired(config?.askAge) && !formData.applicantAge) errs.applicantAge = "年齢は必須です";
    if (isRequired(config?.askOccupation) && !formData.applicantOccupation)
      errs.applicantOccupation = "職業は必須です";
    if (isRequired(config?.askNationality) && !formData.applicantNationality)
      errs.applicantNationality = "国籍は必須です";

    for (const q of questions) {
      if (q.isRequired) {
        const a = formData.answers[q.id];
        if (!a || (Array.isArray(a) && a.length === 0) || a === "") {
          errs[`q_${q.id}`] = `「${q.label}」は必須です`;
        }
      }
    }

    const ticket = event.tickets.find((t) => t.id === formData.ticketId);
    if (ticket && formData.quantity > ticket.purchaseLimit) {
      errs.quantity = `購入上限は${ticket.purchaseLimit}枚です`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleToConfirm = () => {
    if (validate()) setStep("confirm");
  };

  const handleSubmit = () => {
    const answersArray = Object.entries(formData.answers)
      .filter(([, v]) => v !== "" && !(Array.isArray(v) && v.length === 0))
      .map(([questionId, answer]) => ({ questionId, answer }));

    participate.mutate(
      {
        eventId: id,
        data: {
          ticketId: formData.ticketId,
          quantity: formData.quantity,
          discountCode: formData.discountCode || undefined,
          applicantEmail: formData.applicantEmail,
          applicantName: formData.applicantName || undefined,
          applicantNameKana: formData.applicantNameKana || undefined,
          applicantAffiliation: formData.applicantAffiliation || undefined,
          applicantGender: formData.applicantGender || undefined,
          applicantAge: formData.applicantAge ? parseInt(formData.applicantAge, 10) : undefined,
          applicantOccupation: formData.applicantOccupation || undefined,
          applicantNationality: formData.applicantNationality || undefined,
          answers: answersArray.length > 0 ? answersArray : undefined,
        },
      },
      {
        onSuccess: () => router.push(`/events/${id}`),
      },
    );
  };

  const selectedTicket = event.tickets.find((t) => t.id === formData.ticketId);

  const renderQuestionInput = (q: ApplicationQuestion) => {
    const value = formData.answers[q.id];
    const options = (q.options ?? []) as ApplicationQuestionOption[];

    switch (q.questionType) {
      case "text":
        return (
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        );
      case "textarea":
        return (
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        );
      case "radio":
        return (
          <RadioGroup value={(value as string) ?? ""} onValueChange={(v) => setAnswer(q.id, v)}>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={o.value} id={`q_${q.id}_${i}`} />
                <Label htmlFor={`q_${q.id}_${i}`}>{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkbox":
        return (
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  id={`q_${q.id}_${i}`}
                  checked={((value as string[]) ?? []).includes(o.value)}
                  onCheckedChange={() => toggleCheckboxAnswer(q.id, o.value)}
                />
                <Label htmlFor={`q_${q.id}_${i}`}>{o.label}</Label>
              </div>
            ))}
          </div>
        );
      case "select":
        return (
          <Select value={(value as string) ?? ""} onValueChange={(v) => setAnswer(q.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o, i) => (
                <SelectItem key={i} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
    }
  };

  const getAnswerDisplay = (q: ApplicationQuestion): string => {
    const value = formData.answers[q.id];
    if (!value) return "—";
    const options = (q.options ?? []) as ApplicationQuestionOption[];
    if (q.questionType === "checkbox" && Array.isArray(value)) {
      return value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");
    }
    if (q.questionType === "radio" || q.questionType === "select") {
      return options.find((o) => o.value === value)?.label ?? (value as string);
    }
    return value as string;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href={`/events/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">参加申込</h1>
          <p className="text-sm text-muted-foreground">{event.title}</p>
        </div>
      </div>

      {/* ステッパー */}
      <div className="mx-auto flex w-60 items-center">
        {/* Step 1 */}
        <div className="flex items-center gap-1.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
              step === "confirm"
                ? "bg-primary text-primary-foreground"
                : "ring-2 ring-primary bg-primary text-primary-foreground"
            }`}
          >
            {step === "confirm" ? "✓" : "1"}
          </div>
          <span
            className={`text-sm whitespace-nowrap ${step === "input" ? "font-medium" : "text-muted-foreground"}`}
          >
            入力
          </span>
        </div>

        {/* 接続線 */}
        <div className={`mx-2 h-px flex-1 ${step === "confirm" ? "bg-primary" : "bg-border"}`} />

        {/* Step 2 */}
        <div className="flex items-center gap-1.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
              step === "confirm"
                ? "ring-2 ring-primary bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </div>
          <span
            className={`text-sm whitespace-nowrap ${step === "confirm" ? "font-medium" : "text-muted-foreground"}`}
          >
            確認
          </span>
        </div>
      </div>

      {step === "input" ? (
        <>
          {/* チケット選択 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="h-4 w-4" />
                チケット選択
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={formData.ticketId} onValueChange={(v) => set("ticketId", v)}>
                {event.tickets
                  .filter((t) => t.isActive)
                  .map((ticket) => {
                    const remaining =
                      ticket.capacity != null ? ticket.capacity - ticket.soldCount : null;
                    const soldOut = remaining != null && remaining <= 0;
                    return (
                      <div
                        key={ticket.id}
                        className={`flex items-start gap-3 rounded border p-3 ${
                          soldOut ? "opacity-50" : ""
                        }`}
                      >
                        <RadioGroupItem
                          value={ticket.id}
                          id={`ticket_${ticket.id}`}
                          disabled={soldOut}
                          className="mt-0.5"
                        />
                        <Label htmlFor={`ticket_${ticket.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{ticket.ticketName}</span>
                            <span className="font-bold">
                              {ticket.price === 0 ? "無料" : `¥${ticket.price.toLocaleString()}`}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {remaining != null
                              ? soldOut
                                ? "完売"
                                : `残り ${remaining} 枚`
                              : "定員なし"}
                          </div>
                        </Label>
                      </div>
                    );
                  })}
              </RadioGroup>
              {errors.ticketId && (
                <p className="mt-1 text-sm text-destructive">{errors.ticketId}</p>
              )}
            </CardContent>
          </Card>

          {/* 数量 */}
          {selectedTicket && selectedTicket.purchaseLimit > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">数量</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min={1}
                  max={selectedTicket.purchaseLimit}
                  value={formData.quantity}
                  onChange={(e) => set("quantity", parseInt(e.target.value, 10) || 1)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  上限: {selectedTicket.purchaseLimit}枚
                </p>
                {errors.quantity && (
                  <p className="mt-1 text-sm text-destructive">{errors.quantity}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 割引コード */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">割引コード（任意）</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.discountCode}
                onChange={(e) => set("discountCode", e.target.value)}
                placeholder="お持ちの場合は入力"
              />
            </CardContent>
          </Card>

          {/* 基本属性 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">参加者情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* メールアドレス（常時必須） */}
              <div>
                <Label>
                  メールアドレス <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.applicantEmail}
                  onChange={(e) => set("applicantEmail", e.target.value)}
                />
                {errors.applicantEmail && (
                  <p className="mt-1 text-sm text-destructive">{errors.applicantEmail}</p>
                )}
              </div>
              <div>
                <Label>
                  メールアドレス（確認） <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.applicantEmailConfirm}
                  onChange={(e) => set("applicantEmailConfirm", e.target.value)}
                />
                {errors.applicantEmailConfirm && (
                  <p className="mt-1 text-sm text-destructive">{errors.applicantEmailConfirm}</p>
                )}
              </div>

              <Separator />

              {/* 氏名 */}
              {isVisible(config?.askName) && (
                <div>
                  <Label>
                    氏名{" "}
                    {isRequired(config?.askName) && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    value={formData.applicantName}
                    onChange={(e) => set("applicantName", e.target.value)}
                  />
                  {errors.applicantName && (
                    <p className="mt-1 text-sm text-destructive">{errors.applicantName}</p>
                  )}
                </div>
              )}

              {/* ふりがな */}
              {isVisible(config?.askNameKana) && (
                <div>
                  <Label>
                    ふりがな{" "}
                    {isRequired(config?.askNameKana) && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    value={formData.applicantNameKana}
                    onChange={(e) => set("applicantNameKana", e.target.value)}
                  />
                  {errors.applicantNameKana && (
                    <p className="mt-1 text-sm text-destructive">{errors.applicantNameKana}</p>
                  )}
                </div>
              )}

              {/* 所属 */}
              {isVisible(config?.askAffiliation) && (
                <div>
                  <Label>
                    所属{" "}
                    {isRequired(config?.askAffiliation) && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Input
                    value={formData.applicantAffiliation}
                    onChange={(e) => set("applicantAffiliation", e.target.value)}
                  />
                  {errors.applicantAffiliation && (
                    <p className="mt-1 text-sm text-destructive">{errors.applicantAffiliation}</p>
                  )}
                </div>
              )}

              {/* 性別 */}
              {isVisible(config?.askGender) && (
                <div>
                  <Label>
                    性別{" "}
                    {isRequired(config?.askGender) && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={formData.applicantGender}
                    onValueChange={(v) => set("applicantGender", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.applicantGender && (
                    <p className="mt-1 text-sm text-destructive">{errors.applicantGender}</p>
                  )}
                </div>
              )}

              {/* 年齢 */}
              {isVisible(config?.askAge) && (
                <div>
                  <Label>
                    年齢 {isRequired(config?.askAge) && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.applicantAge}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      set("applicantAge", v);
                    }}
                    placeholder="例: 30"
                  />
                  {errors.applicantAge && (
                    <p className="mt-1 text-sm text-destructive">{errors.applicantAge}</p>
                  )}
                </div>
              )}

              {/* 職業 */}
              {isVisible(config?.askOccupation) && (
                <div>
                  <Label>
                    職業{" "}
                    {isRequired(config?.askOccupation) && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Input
                    value={formData.applicantOccupation}
                    onChange={(e) => set("applicantOccupation", e.target.value)}
                  />
                  {errors.applicantOccupation && (
                    <p className="mt-1 text-sm text-destructive">{errors.applicantOccupation}</p>
                  )}
                </div>
              )}

              {/* 国籍 */}
              {isVisible(config?.askNationality) && (
                <div>
                  <Label>
                    国籍{" "}
                    {isRequired(config?.askNationality) && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Input
                    value={formData.applicantNationality}
                    onChange={(e) => set("applicantNationality", e.target.value)}
                  />
                  {errors.applicantNationality && (
                    <p className="mt-1 text-sm text-destructive">{errors.applicantNationality}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* カスタム質問 */}
          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">追加質問</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id}>
                    <Label>
                      {q.label} {q.isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    {q.description && (
                      <p className="mb-1 text-xs text-muted-foreground">{q.description}</p>
                    )}
                    {renderQuestionInput(q)}
                    {errors[`q_${q.id}`] && (
                      <p className="mt-1 text-sm text-destructive">{errors[`q_${q.id}`]}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button className="w-full" size="lg" onClick={handleToConfirm}>
            確認へ進む
          </Button>
        </>
      ) : (
        <>
          {/* 確認ステップ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">申込内容の確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">チケット</span>
                <span className="font-medium">{selectedTicket?.ticketName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">数量</span>
                <span>{formData.quantity}</span>
              </div>
              {formData.discountCode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">割引コード</span>
                  <span>{formData.discountCode}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between">
                <span className="text-muted-foreground">メールアドレス</span>
                <span>{formData.applicantEmail}</span>
              </div>
              {isVisible(config?.askName) && formData.applicantName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">氏名</span>
                  <span>{formData.applicantName}</span>
                </div>
              )}
              {isVisible(config?.askNameKana) && formData.applicantNameKana && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ふりがな</span>
                  <span>{formData.applicantNameKana}</span>
                </div>
              )}
              {isVisible(config?.askAffiliation) && formData.applicantAffiliation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">所属</span>
                  <span>{formData.applicantAffiliation}</span>
                </div>
              )}
              {isVisible(config?.askGender) && formData.applicantGender && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">性別</span>
                  <span>
                    {GENDER_OPTIONS.find((o) => o.value === formData.applicantGender)?.label ??
                      formData.applicantGender}
                  </span>
                </div>
              )}
              {isVisible(config?.askAge) && formData.applicantAge && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">年齢</span>
                  <span>{formData.applicantAge}歳</span>
                </div>
              )}
              {isVisible(config?.askOccupation) && formData.applicantOccupation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">職業</span>
                  <span>{formData.applicantOccupation}</span>
                </div>
              )}
              {isVisible(config?.askNationality) && formData.applicantNationality && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">国籍</span>
                  <span>{formData.applicantNationality}</span>
                </div>
              )}

              {questions.length > 0 && (
                <>
                  <Separator />
                  {questions.map((q) => (
                    <div key={q.id} className="flex justify-between">
                      <span className="text-muted-foreground">{q.label}</span>
                      <span className="max-w-[60%] text-right">{getAnswerDisplay(q)}</span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* キャンセルポリシー */}
          {event.cancellationPolicy && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">キャンセルポリシー</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {event.cancellationPolicy}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="agree-policy"
                    checked={formData.agreePolicy}
                    onCheckedChange={(v) => set("agreePolicy", !!v)}
                  />
                  <Label htmlFor="agree-policy">キャンセルポリシーに同意する</Label>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("input")}>
              戻って修正
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={handleSubmit}
              disabled={
                participate.isPending || (!!event.cancellationPolicy && !formData.agreePolicy)
              }
            >
              申込を確定する
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
