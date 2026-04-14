"use client";

import { useState } from "react";
import Link from "next/link";
import { useReports, useCreateReport } from "@/hooks/moderation/use-moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Shield, Settings } from "lucide-react";
import { SelectField } from "@/components/select-field";

const STATUS_LABELS: Record<string, string> = {
  pending: "未対応",
  reviewing: "確認中",
  resolved: "解決",
  dismissed: "却下",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "未対応" },
  { value: "reviewing", label: "確認中" },
  { value: "resolved", label: "解決" },
  { value: "dismissed", label: "却下" },
];

const TARGET_TYPE_OPTIONS = [
  { value: "post", label: "投稿" },
  { value: "comment", label: "コメント" },
  { value: "user", label: "ユーザー" },
  { value: "message", label: "メッセージ" },
];

const CATEGORY_OPTIONS = [
  { value: "spam", label: "スパム" },
  { value: "harassment", label: "嫌がらせ" },
  { value: "inappropriate", label: "不適切" },
  { value: "copyright", label: "著作権侵害" },
  { value: "other", label: "その他" },
];

export default function ModerationPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { data, isLoading } = useReports({ status });
  const reports = data ?? [];

  const createReport = useCreateReport();
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState("post");
  const [targetId, setTargetId] = useState("");
  const [category, setCategory] = useState("spam");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    createReport.mutate(
      { targetType, targetId, category, description: description || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setTargetId("");
          setDescription("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">モデレーション</h1>
        <div className="flex gap-2">
          <Link href="/moderation/banned-words">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              禁止ワード
            </Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                通報
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>通報を作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>対象種別</Label>
                  <SelectField
                    value={targetType}
                    onChange={setTargetType}
                    options={TARGET_TYPE_OPTIONS}
                  />
                </div>
                <div>
                  <Label>対象ID</Label>
                  <Input value={targetId} onChange={(e) => setTargetId(e.target.value)} />
                </div>
                <div>
                  <Label>カテゴリ</Label>
                  <SelectField value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
                </div>
                <div>
                  <Label>詳細</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!targetId || createReport.isPending}>
                  送信
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SelectField
          value={status ?? "all"}
          onChange={(v) => setStatus(v === "all" ? undefined : v)}
          options={STATUS_OPTIONS}
          includeAll
          placeholder="ステータス"
          className="w-48"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Shield className="mx-auto mb-4 h-12 w-12" />
          <p>通報がありません</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ステータス</TableHead>
                <TableHead>対象</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead>通報者</TableHead>
                <TableHead>日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => (window.location.href = `/moderation/${r.id}`)}
                >
                  <TableCell>
                    <Badge variant={r.status === "pending" ? "default" : "secondary"}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.targetType}</TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell className="text-xs">{r.reporter?.name}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(r.createdAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
