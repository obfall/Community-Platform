"use client";

import { use } from "react";
import Link from "next/link";
import { useMailMessage, useSendMailMessage } from "@/hooks/use-mail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Send } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  sending: "送信中",
  sent: "送信済み",
  failed: "失敗",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  sending: "default",
  sent: "default",
  failed: "destructive",
};

const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  pending: "待機中",
  sent: "送信済み",
  delivered: "配信成功",
  bounced: "バウンス",
  opened: "開封済み",
  clicked: "クリック済み",
  failed: "失敗",
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: message, isLoading } = useMailMessage(id);
  const sendMessage = useSendMailMessage();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!message) {
    return (
      <div className="py-12 text-center text-muted-foreground">メッセージが見つかりません</div>
    );
  }

  const canSend = message.status === "draft" || message.status === "scheduled";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{message.subject}</h1>
          <p className="text-sm text-muted-foreground">
            作成者: {message.createdBy.name} ・{" "}
            {new Date(message.createdAt).toLocaleString("ja-JP")}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[message.status] ?? "secondary"} className="text-sm">
          {STATUS_LABELS[message.status] ?? message.status}
        </Badge>
        {canSend && (
          <Button onClick={() => sendMessage.mutate(id)} disabled={sendMessage.isPending}>
            <Send className="mr-2 h-4 w-4" />
            送信実行
          </Button>
        )}
      </div>

      {/* 配信統計 */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{message.totalRecipients}</div>
            <p className="text-sm text-muted-foreground">配信先総数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{message.sentCount}</div>
            <p className="text-sm text-muted-foreground">送信済み</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{message.deliveredCount}</div>
            <p className="text-sm text-muted-foreground">配信成功</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{message.failedCount}</div>
            <p className="text-sm text-muted-foreground">失敗</p>
          </CardContent>
        </Card>
      </div>

      {/* メール内容プレビュー */}
      <Card>
        <CardHeader>
          <CardTitle>メール内容</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none rounded border p-4"
            dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
          />
        </CardContent>
      </Card>

      {/* 受信者リスト */}
      {message.recipients && message.recipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>受信者一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>送信日時</TableHead>
                  <TableHead>開封日時</TableHead>
                  <TableHead>クリック日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {message.recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {RECIPIENT_STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.sentAt ? new Date(r.sentAt).toLocaleString("ja-JP") : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.openedAt ? new Date(r.openedAt).toLocaleString("ja-JP") : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.clickedAt ? new Date(r.clickedAt).toLocaleString("ja-JP") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
