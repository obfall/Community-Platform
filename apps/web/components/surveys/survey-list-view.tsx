"use client";

import { useState } from "react";
import Link from "next/link";
import { useSurveys, useDeleteSurvey, useUpdateSurveyStatus } from "@/hooks/surveys/use-surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/select-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  ClipboardList,
  Trash2,
  BarChart3,
  Play,
  Square,
  Pencil,
  MoreVertical,
  Users,
} from "lucide-react";
import type { SurveyQuery } from "@/lib/api/types";

const SURVEY_STATUS_OPTIONS = [
  { value: "draft", label: "下書き" },
  { value: "active", label: "受付中" },
  { value: "closed", label: "終了" },
];

const STATUS_LABELS: Record<string, string> = { draft: "下書き", active: "受付中", closed: "終了" };
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  active: "default",
  closed: "outline",
};

interface SurveyListViewProps {
  /** イベントID（指定時はイベント用アンケートのみ表示） */
  eventId?: string;
  /** 各リンクのベースパス（例: "/surveys" or "/events/{id}/survey"） */
  basePath: string;
  /** 新規作成ページのパス */
  createHref: string;
  /** ページタイトル */
  title: string;
  /** タイトルの見出しレベル（デフォルト h1） */
  headingLevel?: "h1" | "h2";
  /** 空状態のサブテキスト */
  emptySubText?: string;
}

export function SurveyListView({
  eventId,
  basePath,
  createHref,
  title,
  headingLevel = "h1",
  emptySubText,
}: SurveyListViewProps) {
  const [query, setQuery] = useState<SurveyQuery>({ page: 1, limit: 20, eventId });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSurveys(query);
  const deleteSurvey = useDeleteSurvey();
  const updateStatus = useUpdateSurveyStatus();
  const surveys = data?.data ?? [];
  const meta = data?.meta;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const Heading = headingLevel;

  /** アンケートIDからリンクパスを生成 */
  const surveyPath = (surveyId: string, sub?: string) =>
    `${basePath}/${surveyId}${sub ? `/${sub}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading className={headingLevel === "h1" ? "text-2xl font-bold" : "text-xl font-bold"}>
          {title}
        </Heading>
        <Link href={createHref}>
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
        <SelectField
          value={query.status ?? "all"}
          onChange={(v) =>
            setQuery((p) => ({ ...p, status: v === "all" ? undefined : v, page: 1 }))
          }
          options={SURVEY_STATUS_OPTIONS}
          includeAll
          placeholder="ステータス"
          className="w-36"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : surveys.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto mb-4 h-12 w-12" />
          <p>アンケートがありません</p>
          {emptySubText && <p className="mt-2 text-sm">{emptySubText}</p>}
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
                  <Link href={surveyPath(s.id)} className="hover:underline">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">メニューを開く</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={surveyPath(s.id, "edit")}>
                          <Pencil className="mr-2 h-4 w-4" />
                          編集
                        </Link>
                      </DropdownMenuItem>
                      {s.status === "draft" && (
                        <DropdownMenuItem
                          onClick={() => updateStatus.mutate({ id: s.id, status: "active" })}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          受付開始
                        </DropdownMenuItem>
                      )}
                      {s.status === "active" && (
                        <DropdownMenuItem
                          onClick={() => updateStatus.mutate({ id: s.id, status: "closed" })}
                        >
                          <Square className="mr-2 h-4 w-4" />
                          受付終了
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={surveyPath(s.id)}>
                          <Users className="mr-2 h-4 w-4" />
                          詳細・回答状況
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={surveyPath(s.id, "results")}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          結果を見る
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(s.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アンケートを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。アンケートと回答データが削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteSurvey.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
