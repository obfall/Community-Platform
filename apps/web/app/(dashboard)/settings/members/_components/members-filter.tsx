"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings.members.filter");
  const tRole = useTranslations("enums.role");
  const tStatus = useTranslations("enums.userStatus");
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
          placeholder={t("searchPlaceholder")}
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
          <SelectValue placeholder={t("rolePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allRoles")}</SelectItem>
          <SelectItem value="owner">{tRole("owner")}</SelectItem>
          <SelectItem value="admin">{tRole("admin")}</SelectItem>
          <SelectItem value="member">{tRole("member")}</SelectItem>
          <SelectItem value="visitor">{tRole("visitor")}</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={query.status ?? "active"}
        onValueChange={(v) => onQueryChange({ status: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t("statusPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          <SelectItem value="active">{tStatus("active")}</SelectItem>
          <SelectItem value="suspended">{tStatus("suspended")}</SelectItem>
          <SelectItem value="withdrawn">{tStatus("withdrawn")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
