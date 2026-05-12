"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMembers } from "@/hooks/members/use-members";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelectField } from "@/components/select-field";
import { Users } from "lucide-react";
import type { UserListQuery } from "@/lib/api/types";

export default function MembersPage() {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const tRole = useTranslations("enums.role");
  const [query, setQuery] = useState<UserListQuery>({
    page: 1,
    limit: 20,
    sortBy: "role",
    sortOrder: "asc",
    // 一般メンバー一覧では admin（システム管理者）は隠す。
    // クライアント側でフィルタすると limit:20 内に admin が混じった時に
    // ページネーション件数とのズレが出るため、サーバ側で除外させる。
    excludeAdmin: true,
  });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useMembers(query);

  const sortOptions = [
    { value: "role-asc", label: t("sort.roleAsc") },
    { value: "name-asc", label: t("sort.nameAsc") },
    { value: "name-desc", label: t("sort.nameDesc") },
    { value: "createdAt-desc", label: t("sort.createdAtDesc") },
    { value: "createdAt-asc", label: t("sort.createdAtAsc") },
  ];

  const members = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      {/* 検索・ソート */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((prev) => ({ ...prev, search: v || undefined, page: 1 }))}
          placeholder={t("search.placeholder")}
        />
        <SelectField
          value={`${query.sortBy ?? "role"}-${query.sortOrder ?? "asc"}`}
          onChange={(v) => {
            const [sortBy, sortOrder] = v.split("-") as [
              "role" | "name" | "createdAt",
              "asc" | "desc",
            ];
            setQuery((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
          }}
          options={sortOptions}
          className="w-44"
        />
      </div>

      {/* メンバー一覧 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>
      ) : members.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-4 h-12 w-12" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.member")}</TableHead>
                <TableHead>{t("table.role")}</TableHead>
                <TableHead>{t("table.joinedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/members/${member.id}`} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
                        <AvatarFallback className="text-xs">
                          {member.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {tRole.has(member.role) ? tRole(member.role) : member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.createdAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ページネーション */}
      {meta && (
        <PaginationBar
          meta={meta}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      )}
    </div>
  );
}
