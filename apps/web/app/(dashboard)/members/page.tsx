"use client";

import { useState } from "react";
import Link from "next/link";
import { useMembers } from "@/hooks/members/use-members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import type { UserListQuery } from "@/lib/api/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  owner: "運営者",
  moderator: "モデレーター",
  member: "メンバー",
};

export default function MembersPage() {
  const [query, setQuery] = useState<UserListQuery>({
    page: 1,
    limit: 20,
    sortBy: "role",
    sortOrder: "asc",
  });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useMembers(query);

  const members = (data?.data ?? []).filter((m) => m.role !== "admin");
  const meta = data?.meta;

  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メンバー</h1>
      </div>

      {/* 検索・ソート */}
      <div className="flex items-center gap-4">
        <div className="flex flex-1 gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="名前で検索..."
            className="max-w-sm"
          />
          <Button variant="outline" onClick={handleSearch}>
            検索
          </Button>
        </div>
        <Select
          value={`${query.sortBy ?? "role"}-${query.sortOrder ?? "asc"}`}
          onValueChange={(v) => {
            const [sortBy, sortOrder] = v.split("-") as [
              "role" | "name" | "createdAt",
              "asc" | "desc",
            ];
            setQuery((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="role-asc">ロール順</SelectItem>
            <SelectItem value="name-asc">名前 A→Z</SelectItem>
            <SelectItem value="name-desc">名前 Z→A</SelectItem>
            <SelectItem value="createdAt-desc">参加日が新しい順</SelectItem>
            <SelectItem value="createdAt-asc">参加日が古い順</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* メンバー一覧 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : members.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-4 h-12 w-12" />
          <p>メンバーが見つかりません</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メンバー</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>参加日</TableHead>
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
                      {ROLE_LABELS[member.role] ?? member.role}
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
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setQuery((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))
            }
            disabled={!meta.hasPreviousPage}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
            disabled={!meta.hasNextPage}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
