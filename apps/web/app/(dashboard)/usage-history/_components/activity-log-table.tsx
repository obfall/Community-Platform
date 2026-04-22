"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ActivityLogItem } from "@/lib/api/types";

const ACTION_LABELS: Record<string, string> = {
  login: "ログイン",
  logout: "ログアウト",
};

interface ActivityLogTableProps {
  logs: ActivityLogItem[];
  isLoading: boolean;
  onSelect: (log: ActivityLogItem) => void;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP");
}

export function ActivityLogTable({ logs, isLoading, onSelect }: ActivityLogTableProps) {
  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">読み込み中...</p>;
  }
  if (logs.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">操作ログが見つかりません</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">日時</TableHead>
            <TableHead>ユーザー</TableHead>
            <TableHead>アクション</TableHead>
            <TableHead className="w-[100px] text-right">詳細</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(log.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {log.user.avatarUrl ? <AvatarImage src={log.user.avatarUrl} /> : null}
                    <AvatarFallback className="text-xs">
                      {getInitials(log.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <p className="text-sm font-medium">{log.user.name}</p>
                    <p className="text-xs text-muted-foreground">{log.user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">{ACTION_LABELS[log.action] ?? log.action}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onSelect(log)}>
                  詳細
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
