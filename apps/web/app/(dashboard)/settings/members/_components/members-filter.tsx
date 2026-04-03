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
import type { UserListQuery } from "@/lib/api/types";

interface MembersFilterProps {
  query: UserListQuery;
  onQueryChange: (partial: Partial<UserListQuery>) => void;
}

export function MembersFilter({ query, onQueryChange }: MembersFilterProps) {
  const [searchInput, setSearchInput] = useState(query.search ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      onQueryChange({ search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="名前で検索..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={query.role ?? "all"}
        onValueChange={(v) => onQueryChange({ role: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="ロール" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべてのロール</SelectItem>
          <SelectItem value="owner">オーナー</SelectItem>
          <SelectItem value="admin">管理者</SelectItem>
          <SelectItem value="moderator">モデレーター</SelectItem>
          <SelectItem value="member">メンバー</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={query.status ?? "active"}
        onValueChange={(v) => onQueryChange({ status: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="active">有効</SelectItem>
          <SelectItem value="suspended">停止中</SelectItem>
          <SelectItem value="withdrawn">退会済み</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
