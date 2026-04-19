"use client";

import { Label } from "@/components/ui/label";

/**
 * イベント配信の宛先セレクタ。
 * 現状は「キャンセル以外の申込者全員」で固定（既存 notifyParticipants と同等）。
 * ステータス絞り込み（applied / attended / no_show）は Phase 4 で拡張予定。
 */
export function AudienceSelectorEvent() {
  return (
    <div className="space-y-2">
      <Label>配信対象</Label>
      <div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">
        このイベントの申込者全員（キャンセル除く）
      </div>
    </div>
  );
}
