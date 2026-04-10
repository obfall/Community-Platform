"use client";

import { useState } from "react";
import Link from "next/link";
import { useSurveys, useDeleteSurvey, useUpdateSurveyStatus } from "@/hooks/surveys/use-surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ClipboardList, Trash2, BarChart3, Play, Square, Pencil } from "lucide-react";
import type { SurveyQuery } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = { draft: "下書き", active: "受付中", closed: "終了" };
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  active: "default",
  closed: "outline",
};

export default function SurveysPage() {
  const [query, setQuery] = useState<SurveyQuery>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSurveys(query);
  const deleteSurvey = useDeleteSurvey();
  const updateStatus = useUpdateSurveyStatus();
  const surveys = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">アンケート</h1>
        <Link href="/surveys/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            作成
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && setQuery((p) => ({ ...p, search: search || undefined, page: 1 }))
          }
          placeholder="検索..."
          className="max-w-xs"
        />
        <Select
          value={query.status ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, status: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="active">受付中</SelectItem>
            <SelectItem value="closed">終了</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : surveys.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto mb-4 h-12 w-12" />
          <p>アンケートがありません</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>質問数</TableHead>
              <TableHead>回答数</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link href={`/surveys/${s.id}/respond`} className="hover:underline">
                    {s.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[s.status] ?? "secondary"} className="text-xs">
                    {STATUS_LABELS[s.status] ?? s.status}
                  </Badge>
                </TableCell>
                <TableCell>{s.questionCount}</TableCell>
                <TableCell>{s.responseCount}</TableCell>
                <TableCell>{new Date(s.createdAt).toLocaleDateString("ja-JP")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/surveys/${s.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    {s.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateStatus.mutate({ id: s.id, status: "active" })}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {s.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateStatus.mutate({ id: s.id, status: "closed" })}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                    <Link href={`/surveys/${s.id}/results`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteSurvey.mutate(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
            disabled={!meta.hasPreviousPage}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            disabled={!meta.hasNextPage}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
