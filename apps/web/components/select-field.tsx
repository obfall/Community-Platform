"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectFieldOption {
  value: string;
  label: string;
}

/** 「なし」を表す sentinel 値。呼び出し側で空文字・null への変換に使う */
export const NONE_VALUE = "__none__";

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  /** 先頭に「すべて」(value: "all") を追加する（一覧フィルタ用） */
  includeAll?: boolean;
  /** 先頭に「なし」(value: NONE_VALUE) を追加する（任意項目のフォーム用） */
  includeNone?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * 選択肢の配列から Select を描画する汎用コンポーネント。
 * - 一覧フィルタ: `includeAll` を指定して「すべて」を先頭に追加
 * - 任意項目フォーム: `includeNone` を指定して「なし」を先頭に追加（値は NONE_VALUE）
 * - 必須項目フォーム: どちらも省略
 */
export function SelectField({
  value,
  onChange,
  options,
  includeAll = false,
  includeNone = false,
  placeholder,
  className,
}: SelectFieldProps) {
  const items = [
    ...(includeAll ? [{ value: "all", label: "すべて" }] : []),
    ...(includeNone ? [{ value: NONE_VALUE, label: "なし" }] : []),
    ...options,
  ];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
