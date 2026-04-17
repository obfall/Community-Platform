"use client";

import { Button } from "@/components/ui/button";

interface StickyFooterBarProps {
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  /** submit ボタンの type（デフォルト: "submit"） */
  submitType?: "submit" | "button";
  /** submitType="button" の場合に使う onClick */
  onSubmit?: () => void;
}

export function StickyFooterBar({
  onCancel,
  submitLabel = "更新する",
  cancelLabel = "キャンセル",
  disabled = false,
  submitType = "submit",
  onSubmit,
}: StickyFooterBarProps) {
  return (
    <div className="sticky bottom-0 z-40 -mx-6 border-t bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          type={submitType}
          disabled={disabled}
          onClick={submitType === "button" ? onSubmit : undefined}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
