"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSurvey, useSubmitSurveyResponse } from "@/hooks/use-surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function SurveyRespondPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: survey, isLoading } = useSurvey(id);
  const submitResponse = useSubmitSurveyResponse();
  const [answers, setAnswers] = useState<
    Record<string, { selectedOptions?: string[]; textValue?: string; numericValue?: number }>
  >({});

  const setAnswer = (
    questionId: string,
    value: { selectedOptions?: string[]; textValue?: string; numericValue?: number },
  ) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (!survey) return;
    submitResponse.mutate(
      {
        surveyId: id,
        answers: survey.questions.map((q) => ({
          questionId: q.id,
          ...answers[q.id],
        })),
      },
      { onSuccess: () => router.push("/surveys") },
    );
  };

  // options の value が重複していたらインデックスベースで一意化
  const normalizedQuestions = survey?.questions.map((q) => {
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

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!survey || !normalizedQuestions)
    return (
      <div className="py-12 text-center text-muted-foreground">アンケートが見つかりません</div>
    );
  if (survey.status !== "active")
    return (
      <div className="py-12 text-center text-muted-foreground">
        このアンケートは現在回答を受け付けていません
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/surveys">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          {survey.description && (
            <p className="mt-1 text-sm text-muted-foreground">{survey.description}</p>
          )}
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
        <Link href="/surveys">
          <Button variant="outline">戻る</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={submitResponse.isPending}>
          {submitResponse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          回答を送信
        </Button>
      </div>
    </div>
  );
}
