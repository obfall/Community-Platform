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
import type { ActivityLogQuery } from "@/lib/api/types";
import { DateRangeInput } from "./date-range-input";

interface ActivityLogFiltersProps {
  query: ActivityLogQuery;
  onQueryChange: (partial: Partial<ActivityLogQuery>) => void;
}

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "login", label: "ログイン" },
  { value: "logout", label: "ログアウト" },
];

export function ActivityLogFilters({ query, onQueryChange }: ActivityLogFiltersProps) {
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
        value={query.action ?? "all"}
        onValueChange={(v) => onQueryChange({ action: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="アクション" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべてのアクション</SelectItem>
          {ACTION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DateRangeInput from={query.from} to={query.to} onChange={(range) => onQueryChange(range)} />
    </div>
  );
}
