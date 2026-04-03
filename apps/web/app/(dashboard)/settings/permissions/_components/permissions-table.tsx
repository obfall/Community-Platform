"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionDialog } from "./permission-dialog";
import { DeletePermissionDialog } from "./delete-permission-dialog";
import type { PermissionSetting } from "@/lib/api/types";

const ROLE_LABELS: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  moderator: "モデレーター",
  member: "メンバー",
};

interface PermissionsTableProps {
  featureKeyFilter: string | undefined;
}

export function PermissionsTable({ featureKeyFilter }: PermissionsTableProps) {
  const { data: permissions, isLoading } = usePermissions(featureKeyFilter);
  const [editPermission, setEditPermission] = useState<PermissionSetting | undefined>();
  const [deletePermission, setDeletePermission] = useState<PermissionSetting | null>(null);

  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!permissions || permissions.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">権限設定がありません</p>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>機能</TableHead>
              <TableHead>アクション</TableHead>
              <TableHead>許可ロール</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm) => (
              <TableRow key={perm.id}>
                <TableCell className="font-medium">{perm.featureSetting.featureName}</TableCell>
                <TableCell>{perm.action}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {perm.allowedRoles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {ROLE_LABELS[role] ?? role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditPermission(perm)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">編集</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletePermission(perm)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">削除</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PermissionDialog
        open={!!editPermission}
        onOpenChange={(open) => {
          if (!open) setEditPermission(undefined);
        }}
        permission={editPermission}
      />

      <DeletePermissionDialog
        open={!!deletePermission}
        onOpenChange={(open) => {
          if (!open) setDeletePermission(null);
        }}
        permission={deletePermission}
      />
    </>
  );
}
