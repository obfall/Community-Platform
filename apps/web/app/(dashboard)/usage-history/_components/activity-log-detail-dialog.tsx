"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ActivityLogItem } from "@/lib/api/types";

const ACTION_LABELS: Record<string, string> = {
  login: "ログイン",
  logout: "ログアウト",
};

interface ActivityLogDetailDialogProps {
  log: ActivityLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP");
}

export function ActivityLogDetailDialog({ log, open, onOpenChange }: ActivityLogDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>操作ログ詳細</DialogTitle>
        </DialogHeader>

        {log && (
          <div className="space-y-4 text-sm">
            <Row label="日時" value={formatDateTime(log.createdAt)} />
            <Row label="ユーザー" value={`${log.user.name} (${log.user.email})`} />
            <Row label="アクション" value={ACTION_LABELS[log.action] ?? log.action} />
            {log.metadata && Object.keys(log.metadata).length > 0 ? (
              <div>
                <p className="mb-1 text-muted-foreground">metadata</p>
                <pre className="max-h-72 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
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
