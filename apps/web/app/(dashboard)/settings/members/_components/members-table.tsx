"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserListItem } from "@/lib/api/types";

const ROLE_LABELS: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  moderator: "モデレーター",
  member: "メンバー",
};

const STATUS_LABELS: Record<string, string> = {
  active: "有効",
  suspended: "停止中",
  withdrawn: "退会済み",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  suspended: "destructive",
  withdrawn: "outline",
};

interface MembersTableProps {
  users: UserListItem[];
  isLoading: boolean;
  onSelectUser: (userId: string) => void;
}

export function MembersTable({ users, isLoading, onSelectUser }: MembersTableProps) {
  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (users.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">メンバーが見つかりません</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>メンバー</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>登録日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const initials = user.name
              .split(/\s+/)
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <TableRow
                key={user.id}
                className="cursor-pointer"
                onClick={() => onSelectUser(user.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[user.status] ?? "outline"}>
                    {STATUS_LABELS[user.status] ?? user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
