"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LoginHistoryItem } from "@/lib/api/types";

interface LoginHistoryDetailDialogProps {
  log: LoginHistoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP");
}

export function LoginHistoryDetailDialog({
  log,
  open,
  onOpenChange,
}: LoginHistoryDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>ログイン履歴 詳細</DialogTitle>
        </DialogHeader>

        {log && (
          <div className="space-y-4 text-sm">
            <Row label="日時" value={formatDateTime(log.createdAt)} />
            <Row label="ユーザー" value={`${log.user.name} (${log.user.email})`} />
            <div className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-muted-foreground">結果</span>
              {log.status === "success" ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-500">成功</Badge>
              ) : (
                <Badge variant="destructive">失敗</Badge>
              )}
            </div>
            <Row label="失敗理由" value={log.failureReason ?? "-"} />
            <div>
              <p className="mb-1 text-muted-foreground">User Agent</p>
              <pre className="max-h-40 overflow-auto rounded bg-muted p-3 text-xs break-all whitespace-pre-wrap">
                {log.userAgent ?? "(なし)"}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
