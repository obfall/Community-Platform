"use client";

import { Input } from "@/components/ui/input";

interface DateRangeInputProps {
  from: string | undefined;
  to: string | undefined;
  onChange: (next: { from?: string; to?: string }) => void;
}

export function DateRangeInput({ from, to, onChange }: DateRangeInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        className="w-[160px]"
        value={from ?? ""}
        onChange={(e) => onChange({ from: e.target.value || undefined, to })}
      />
      <span className="text-sm text-muted-foreground">〜</span>
      <Input
        type="date"
        className="w-[160px]"
        value={to ?? ""}
        onChange={(e) => onChange({ from, to: e.target.value || undefined })}
      />
    </div>
  );
}
