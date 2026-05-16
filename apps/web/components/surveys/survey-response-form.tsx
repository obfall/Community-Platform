"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import type { SurveyDetail } from "@/lib/api/types";

export interface AnswerPayload {
  questionId: string;
  selectedOptions?: string[];
  textValue?: string;
  numericValue?: number;
}

interface SurveyResponseFormProps {
  survey: SurveyDetail;
  onSubmit: (answers: AnswerPayload[]) => void;
  isSubmitting: boolean;
  showCompleted?: boolean;
}

function normalizeQuestions(questions: SurveyDetail["questions"]) {
  return questions.map((q) => {
    if (!q.options) return q;
    const seen = new Set<string>();
    const hasDuplicates = q.options.some((o) => {
      if (seen.has(o.value)) return true;
      seen.add(o.value);
      return false;
    });
    if (!hasDuplicates) return q;
    return {
      ...q,
      options: q.options.map((o, i) => ({ ...o, value: `opt_${i}` })),
    };
  });
}

export function SurveyResponseForm({
  survey,
  onSubmit,
  isSubmitting,
  showCompleted = false,
}: SurveyResponseFormProps) {
  const router = useRouter();
  const goBack = () => router.back();

  const [answers, setAnswers] = useState<
    Record<string, { selectedOptions?: string[]; textValue?: string; numericValue?: number }>
  >({});
  const [completed, setCompleted] = useState(false);

  const normalizedQuestions = normalizeQuestions(survey.questions);

  const setAnswer = (
    questionId: string,
    value: { selectedOptions?: string[]; textValue?: string; numericValue?: number },
  ) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    const cleanedAnswers: AnswerPayload[] = survey.questions.map((q) => {
      const a = answers[q.id] ?? {};
      return {
        questionId: q.id,
        ...(a.selectedOptions && a.selectedOptions.length > 0
          ? { selectedOptions: a.selectedOptions }
          : {}),
        ...(a.textValue ? { textValue: a.textValue } : {}),
        ...(a.numericValue !== undefined ? { numericValue: a.numericValue } : {}),
      };
    });
    onSubmit(cleanedAnswers);
    if (showCompleted) {
      setCompleted(true);
    }
  };

  if (survey.status !== "active") {
    return (
      <div className="py-12 text-center text-muted-foreground">
        このアンケートは現在回答を受け付けていません
      </div>
    );
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-bold">回答ありがとうございました</h2>
            <p className="text-sm text-muted-foreground">アンケートへのご回答が送信されました。</p>
            <Button variant="outline" onClick={goBack}>
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalQuestions = normalizedQuestions.length;
  const answeredCount = Object.keys(answers).filter((qId) => {
    const a = answers[qId];
    if (!a) return false;
    return (
      (a.selectedOptions && a.selectedOptions.length > 0) ||
      (a.textValue && a.textValue.trim() !== "") ||
      a.numericValue !== undefined
    );
  }).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          {survey.description && (
            <p className="mt-1 text-sm text-muted-foreground">{survey.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{totalQuestions}問</span>
        <span>|</span>
        <span>
          回答済み {answeredCount} / {totalQuestions}
        </span>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {normalizedQuestions.map((q, idx) => (
        <Card key={q.id ?? idx}>
          <CardHeader>
            <CardTitle className="text-base">
              {idx + 1}. {q.questionText}
              {q.isRequired && <span className="ml-1 text-destructive">*</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {q.questionType === "single_choice" && q.options && (
              <RadioGroup
                value={answers[q.id]?.selectedOptions?.[0] ?? ""}
                onValueChange={(v) => setAnswer(q.id, { selectedOptions: [v] })}
              >
                {q.options.map((o, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <RadioGroupItem value={o.value} id={`${q.id}-${oIdx}`} />
                    <Label htmlFor={`${q.id}-${oIdx}`}>{o.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            {q.questionType === "multi_choice" && q.options && (
              <div className="space-y-2">
                {q.options.map((o, oIdx) => {
                  const selected = answers[q.id]?.selectedOptions ?? [];
                  return (
                    <label key={oIdx} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(o.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selected, o.value]
                            : selected.filter((v) => v !== o.value);
                          setAnswer(q.id, { selectedOptions: next });
                        }}
                      />
                      {o.label}
                    </label>
                  );
                })}
              </div>
            )}
            {q.questionType === "text" && (
              <Textarea
                value={answers[q.id]?.textValue ?? ""}
                onChange={(e) => setAnswer(q.id, { textValue: e.target.value })}
                placeholder="回答を入力"
                rows={3}
              />
            )}
            {(q.questionType === "rating" || q.questionType === "number") && (
              <Input
                type="number"
                value={answers[q.id]?.numericValue ?? ""}
                onChange={(e) =>
                  setAnswer(q.id, {
                    numericValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                min={q.minValue ?? undefined}
                max={q.maxValue ?? undefined}
                placeholder={
                  q.minValue != null && q.maxValue != null
                    ? `${q.minValue} 〜 ${q.maxValue}`
                    : "数値を入力"
                }
              />
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={goBack}>
          戻る
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          回答を送信
        </Button>
      </div>
    </div>
  );
}
