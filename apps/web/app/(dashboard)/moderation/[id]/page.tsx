"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useReport, useUpdateReport, useCreateAction } from "@/hooks/moderation/use-moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "未対応",
  reviewing: "確認中",
  resolved: "解決",
  dismissed: "却下",
};

export default function ModerationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useReport(id);
  const updateReport = useUpdateReport();
  const createAction = useCreateAction();

  const [actionType, setActionType] = useState("warning");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleStatusChange = (status: string) => {
    updateReport.mutate({ id, data: { status } });
  };

  const handleCreateAction = () => {
    if (!data) return;
    createAction.mutate(
      {
        reportId: id,
        data: {
          actionType,
          targetType: data.targetType,
          targetId: data.targetId,
          reason: reason || undefined,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          setReason("");
          setNotes("");
        },
      },
    );
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">通報が見つかりません</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/moderation">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Badge>{STATUS_LABELS[data.status] ?? data.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>通報詳細</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">対象種別: </span>
            {data.targetType}
          </div>
          <div>
            <span className="text-muted-foreground">対象ID: </span>
            {data.targetId}
          </div>
          <div>
            <span className="text-muted-foreground">カテゴリ: </span>
            {data.category}
          </div>
          <div>
            <span className="text-muted-foreground">通報者: </span>
            {data.reporter?.name}
          </div>
          {data.description && (
            <div>
              <span className="text-muted-foreground">詳細: </span>
              <p className="mt-1 whitespace-pre-wrap">{data.description}</p>
            </div>
          )}
          <div>
            <Label>ステータス変更</Label>
            <Select value={data.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">未対応</SelectItem>
                <SelectItem value="reviewing">確認中</SelectItem>
                <SelectItem value="resolved">解決</SelectItem>
                <SelectItem value="dismissed">却下</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アクション履歴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.actions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">アクションはありません</p>
          ) : (
            (data.actions ?? []).map((a) => (
              <div key={a.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{a.actionType}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{a.moderator?.name}</div>
                {a.reason && <p className="mt-1">{a.reason}</p>}
                {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アクション追加</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>アクション種別</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="content_remove">コンテンツ削除</SelectItem>
                <SelectItem value="user_mute">ユーザーミュート</SelectItem>
                <SelectItem value="user_ban">ユーザーBAN</SelectItem>
                <SelectItem value="no_action">対応不要</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>理由</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <Label>メモ</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreateAction} disabled={createAction.isPending}>
              記録
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
