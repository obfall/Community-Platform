"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LoginHistoryQuery, LoginHistoryStatus } from "@/lib/api/types";
import { DateRangeInput } from "./date-range-input";

interface LoginHistoryFiltersProps {
  query: LoginHistoryQuery;
  onQueryChange: (partial: Partial<LoginHistoryQuery>) => void;
}

export function LoginHistoryFilters({ query, onQueryChange }: LoginHistoryFiltersProps) {
  const [searchInput, setSearchInput] = useState(query.search ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      onQueryChange({ search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ユーザー名 / メールで検索..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={query.status ?? "all"}
        onValueChange={(v) =>
          onQueryChange({ status: v === "all" ? undefined : (v as LoginHistoryStatus) })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="結果" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="success">成功</SelectItem>
          <SelectItem value="failure">失敗</SelectItem>
        </SelectContent>
      </Select>
      <DateRangeInput from={query.from} to={query.to} onChange={(range) => onQueryChange(range)} />
    </div>
  );
}
