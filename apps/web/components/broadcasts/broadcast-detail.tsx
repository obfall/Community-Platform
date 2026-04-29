"use client";

import Link from "next/link";
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
import { SafeHtml } from "@/components/safe-html";
import type { BroadcastDetail as BroadcastDetailData } from "@/lib/api/types";

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

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "アプリ内",
  email: "メール",
  line: "LINE",
};

interface Props {
  broadcast: BroadcastDetailData;
  backHref: string;
  onSend?: () => void;
  isSending?: boolean;
}

export function BroadcastDetail({ broadcast, backHref, onSend, isSending }: Props) {
  const canSend = broadcast.status === "draft" || broadcast.status === "scheduled";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{broadcast.subject}</h1>
          <p className="text-sm text-muted-foreground">
            作成者: {broadcast.createdBy.name} ・{" "}
            {new Date(broadcast.createdAt).toLocaleString("ja-JP")} ・ チャネル:{" "}
            {broadcast.channels.map((c) => CHANNEL_LABELS[c] ?? c).join(" / ")}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[broadcast.status] ?? "secondary"} className="text-sm">
          {STATUS_LABELS[broadcast.status] ?? broadcast.status}
        </Badge>
        {canSend && onSend && (
          <Button onClick={onSend} disabled={isSending}>
            <Send className="mr-2 h-4 w-4" />
            送信実行
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>本文</CardTitle>
        </CardHeader>
        <CardContent>
          {broadcast.bodyHtml ? (
            <SafeHtml
              html={broadcast.bodyHtml}
              className="prose prose-sm max-w-none rounded border p-4"
            />
          ) : (
            <div className="whitespace-pre-wrap rounded border p-4 text-sm">
              {broadcast.bodyText}
            </div>
          )}
        </CardContent>
      </Card>

      {broadcast.recipients && broadcast.recipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>受信者一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>宛先</TableHead>
                  <TableHead>チャネル</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>送信日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcast.recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.email}</TableCell>
                    <TableCell className="text-sm">
                      {CHANNEL_LABELS[r.channel] ?? r.channel}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {RECIPIENT_STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.sentAt ? new Date(r.sentAt).toLocaleString("ja-JP") : "-"}
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
