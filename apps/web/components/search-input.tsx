"use client";

import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter キー押下時に発火。引数は現在の入力値。 */
  onSubmit: (value: string) => void;
  placeholder?: string;
  /** 既定: max-w-sm。ページ側で max-w-xs などに上書き可能。 */
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  className = "max-w-sm",
}: SearchInputProps) {
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit(value);
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}
