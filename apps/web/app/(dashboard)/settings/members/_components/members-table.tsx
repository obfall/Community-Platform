"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HighlightedText } from "@/components/highlighted-text";
import { cn } from "@/lib/utils";
import type { UserListItem } from "@/lib/api/types";

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
  const t = useTranslations("settings.members");
  const tCommon = useTranslations("common");
  const tRole = useTranslations("enums.role");
  const tStatus = useTranslations("enums.userStatus");

  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">{tCommon("loading")}</p>;
  }

  if (users.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.member")}</TableHead>
            <TableHead>{t("table.email")}</TableHead>
            <TableHead>{t("table.role")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead>{t("table.createdAt")}</TableHead>
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

            const isSuspended = user.status === "suspended";

            return (
              <TableRow
                key={user.id}
                className={cn("cursor-pointer", isSuspended && "bg-muted/40 text-muted-foreground")}
                onClick={() => onSelectUser(user.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      <HighlightedText html={user.titleHighlighted} fallback={user.name} />
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {tRole.has(user.role) ? tRole(user.role) : user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[user.status] ?? "outline"}>
                    {tStatus.has(user.status) ? tStatus(user.status) : user.status}
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
