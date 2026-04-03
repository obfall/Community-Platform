"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeletePermission } from "@/hooks/use-permissions";
import type { PermissionSetting } from "@/lib/api/types";

interface DeletePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: PermissionSetting | null;
}

export function DeletePermissionDialog({
  open,
  onOpenChange,
  permission,
}: DeletePermissionDialogProps) {
  const deleteMutation = useDeletePermission();

  const handleDelete = async () => {
    if (!permission) return;
    await deleteMutation.mutateAsync(permission.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>権限設定を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。
            {permission && (
              <>
                「{permission.featureSetting.featureName}」の「{permission.action}
                」権限が削除されます。
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "削除中..." : "削除する"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
