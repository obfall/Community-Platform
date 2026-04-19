"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { BroadcastChannel } from "@/lib/api/types";

const CHANNEL_OPTIONS: Array<{
  value: BroadcastChannel;
  label: string;
  disabled?: boolean;
  hint?: string;
}> = [
  { value: "in_app", label: "アプリ内通知" },
  { value: "email", label: "メール", disabled: true, hint: "Phase 4 で Resend 統合予定" },
  { value: "line", label: "LINE", disabled: true, hint: "Phase 4 で LINE 連携予定" },
];

interface Props {
  value: BroadcastChannel[];
  onChange: (next: BroadcastChannel[]) => void;
}

export function ChannelSelector({ value, onChange }: Props) {
  const toggle = (channel: BroadcastChannel, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...value, channel]))
      : value.filter((c) => c !== channel);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>配信チャネル</Label>
      <div className="space-y-2">
        {CHANNEL_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-2 text-sm ${
              opt.disabled ? "opacity-60" : "cursor-pointer"
            }`}
            title={opt.hint}
          >
            <Checkbox
              checked={value.includes(opt.value)}
              onCheckedChange={(checked) => toggle(opt.value, checked === true)}
              disabled={opt.disabled}
            />
            <span>{opt.label}</span>
            {opt.hint && <span className="text-xs text-muted-foreground">（{opt.hint}）</span>}
          </label>
        ))}
      </div>
    </div>
  );
}
