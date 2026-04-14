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

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  /** 先頭に「すべて」(value: "all") を追加する（一覧フィルタ用） */
  includeAll?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * 選択肢の配列から Select を描画する汎用コンポーネント。
 * - 一覧フィルタ: `includeAll` を指定して「すべて」を先頭に追加
 * - 登録・編集フォーム: `includeAll` を省略してそのまま使用
 */
export function SelectField({
  value,
  onChange,
  options,
  includeAll = false,
  placeholder,
  className,
}: SelectFieldProps) {
  const items = includeAll ? [{ value: "all", label: "すべて" }, ...options] : options;

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
