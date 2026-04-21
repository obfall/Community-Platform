"use client";

import { Label } from "@/components/ui/label";

/**
 * グローバル配信の宛先セレクタ。
 * 現状は「コミュニティ参加者全員」で固定。ランク/カスタム指定は将来拡張予定。
 */
export function AudienceSelectorGlobal() {
  return (
    <div className="space-y-2">
      <Label>配信対象</Label>
      <div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">
        コミュニティ参加者全員
      </div>
    </div>
  );
}
