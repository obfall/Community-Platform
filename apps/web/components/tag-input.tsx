"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_EVENT_TAGS, MAX_EVENT_TAG_LENGTH } from "@community-platform/shared";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * ピル風の自由入力タグ UI。
 *
 * - テキスト欄に入力 → Enter または「,」で確定
 * - 確定済みタグは pill 表示、× で削除
 * - 重複・空文字は自動で除外
 * - 最大 maxTags 個まで（超えると入力欄が非表示になる）
 */
interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  maxTags?: number;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  maxTags = MAX_EVENT_TAGS,
  maxLength = MAX_EVENT_TAG_LENGTH,
  placeholder,
  disabled,
}: TagInputProps) {
  const t = useTranslations("events.tagInput");
  const resolvedPlaceholder = placeholder ?? t("placeholder");
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft("");
      return;
    }
    if (value.includes(trimmed)) {
      setDraft("");
      return;
    }
    if (value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      remove(value.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-2 py-1.5">
      {value.map((tag, idx) => (
        <Badge key={`${tag}-${idx}`} variant="secondary" className="gap-1">
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(idx)}
              className="rounded-sm hover:bg-muted-foreground/20"
              aria-label={t("removeAria", { tag })}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {value.length < maxTags && !disabled && (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={value.length === 0 ? resolvedPlaceholder : ""}
          maxLength={maxLength}
          className="h-7 min-w-32 flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
        />
      )}
    </div>
  );
}
