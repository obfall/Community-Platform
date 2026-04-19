"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BroadcastTargetType } from "@/lib/api/types";

interface Props {
  targetType: BroadcastTargetType;
  onTargetTypeChange: (value: BroadcastTargetType) => void;
}

/**
 * グローバル配信の宛先セレクタ（全メンバー / ランク / カスタム）。
 * 現状 rank/custom の詳細フィルタ UI は省略。targetFilter は Phase 4 で拡張。
 */
export function AudienceSelectorGlobal({ targetType, onTargetTypeChange }: Props) {
  return (
    <div className="space-y-2">
      <Label>配信対象</Label>
      <Select
        value={targetType}
        onValueChange={(v) => onTargetTypeChange(v as BroadcastTargetType)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全メンバー</SelectItem>
          <SelectItem value="rank">ランク指定</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
