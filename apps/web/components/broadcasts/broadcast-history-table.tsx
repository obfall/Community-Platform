"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Broadcast } from "@/lib/api/types";

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

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "アプリ内",
  email: "メール",
  line: "LINE",
};

interface Props {
  broadcasts: Broadcast[];
  detailHrefPrefix: string;
}

export function BroadcastHistoryTable({ broadcasts, detailHrefPrefix }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>件名</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>チャネル</TableHead>
          <TableHead>対象</TableHead>
          <TableHead className="text-right">送信数</TableHead>
          <TableHead>作成者</TableHead>
          <TableHead>作成日</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {broadcasts.map((b) => (
          <TableRow key={b.id}>
            <TableCell>
              <Link href={`${detailHrefPrefix}/${b.id}`} className="font-medium hover:underline">
                {b.subject}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANTS[b.status] ?? "secondary"}>
                {STATUS_LABELS[b.status] ?? b.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">
              {b.channels.map((c) => CHANNEL_LABELS[c] ?? c).join(" / ")}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{b.targetType}</TableCell>
            <TableCell className="text-right">{b.sentCount}</TableCell>
            <TableCell className="text-sm">{b.createdBy.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(b.createdAt).toLocaleDateString("ja-JP")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
