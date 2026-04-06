"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateSurvey } from "@/hooks/use-surveys";
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
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";

interface QuestionDraft {
  questionType: string;
  questionText: string;
  isRequired: boolean;
  options: Array<{ value: string; label: string }>;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: "単一選択",
  multi_choice: "複数選択",
  text: "テキスト",
  rating: "評価",
  number: "数値",
};

export default function SurveyNewPage() {
  const router = useRouter();
  const createSurvey = useCreateSurvey();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      questionType: "single_choice",
      questionText: "",
      isRequired: false,
      options: [{ value: "1", label: "" }],
    },
  ]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        questionType: "single_choice",
        questionText: "",
        isRequired: false,
        options: [{ value: "1", label: "" }],
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: unknown) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: [...q.options, { value: String(q.options.length + 1), label: "" }] }
          : q,
      ),
    );
  };

  const updateOption = (qIdx: number, oIdx: number, label: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, label } : o)) }
          : q,
      ),
    );
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q,
      ),
    );
  };

  const handleSubmit = () => {
    const hasChoice = (t: string) => t === "single_choice" || t === "multi_choice";
    createSurvey.mutate(
      {
        title,
        description: description || undefined,
        questions: questions.map((q, i) => ({
          questionType: q.questionType,
          questionText: q.questionText,
          isRequired: q.isRequired,
          sortOrder: i,
          ...(hasChoice(q.questionType) ? { options: q.options.filter((o) => o.label) } : {}),
        })),
      },
      { onSuccess: () => router.push("/surveys") },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/surveys">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">アンケート作成</h1>
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
              placeholder="アンケートタイトル"
              maxLength={200}
            />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="説明（任意）"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {questions.map((q, qIdx) => (
        <Card key={qIdx}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">質問 {qIdx + 1}</CardTitle>
            {questions.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => removeQuestion(qIdx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>質問タイプ</Label>
                <Select
                  value={q.questionType}
                  onValueChange={(v) => updateQuestion(qIdx, "questionType", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={q.isRequired}
                    onChange={(e) => updateQuestion(qIdx, "isRequired", e.target.checked)}
                  />
                  必須
                </label>
              </div>
            </div>
            <div>
              <Label>質問文</Label>
              <Textarea
                value={q.questionText}
                onChange={(e) => updateQuestion(qIdx, "questionText", e.target.value)}
                placeholder="質問を入力"
                rows={2}
              />
            </div>
            {(q.questionType === "single_choice" || q.questionType === "multi_choice") && (
              <div className="space-y-2">
                <Label>選択肢</Label>
                {q.options.map((o, oIdx) => (
                  <div key={oIdx} className="flex gap-2">
                    <Input
                      value={o.label}
                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                      placeholder={`選択肢 ${oIdx + 1}`}
                    />
                    {q.options.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => removeOption(qIdx, oIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addOption(qIdx)}>
                  <Plus className="mr-1 h-3 w-3" />
                  選択肢追加
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        質問を追加
      </Button>

      <div className="flex justify-end gap-2">
        <Link href="/surveys">
          <Button variant="outline">キャンセル</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={!title || questions.some((q) => !q.questionText) || createSurvey.isPending}
        >
          {createSurvey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          作成
        </Button>
      </div>
    </div>
  );
}
