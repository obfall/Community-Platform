"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useFeatures } from "@/hooks/use-features";
import { useCreatePermission, useUpdatePermission } from "@/hooks/use-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RoleCheckboxGroup } from "./role-checkbox-group";
import type { PermissionSetting } from "@/lib/api/types";

const permissionFormSchema = z.object({
  featureKey: z.string().min(1, "機能を選択してください"),
  action: z.string().min(1, "アクションを入力してください").max(50),
  allowedRoles: z.array(z.string()).min(1, "少なくとも1つのロールを選択してください"),
});

type PermissionFormValues = z.infer<typeof permissionFormSchema>;

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission?: PermissionSetting;
}

export function PermissionDialog({ open, onOpenChange, permission }: PermissionDialogProps) {
  const { data: features } = useFeatures();
  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();

  const isEdit = !!permission;

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      featureKey: "",
      action: "",
      allowedRoles: ["owner", "admin"],
    },
  });

  useEffect(() => {
    if (open) {
      if (permission) {
        form.reset({
          featureKey: permission.featureKey,
          action: permission.action,
          allowedRoles: permission.allowedRoles,
        });
      } else {
        form.reset({
          featureKey: "",
          action: "",
          allowedRoles: ["owner", "admin"],
        });
      }
    }
  }, [open, permission, form]);

  async function onSubmit(values: PermissionFormValues) {
    if (isEdit && permission) {
      await updateMutation.mutateAsync({
        id: permission.id,
        data: { allowedRoles: values.allowedRoles },
      });
    } else {
      await createMutation.mutateAsync(values);
    }
    onOpenChange(false);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "権限を編集" : "権限を追加"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "許可ロールを変更できます" : "新しい権限設定を作成します"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="featureKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>機能</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="機能を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {features?.map((f) => (
                        <SelectItem key={f.featureKey} value={f.featureKey}>
                          {f.featureName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>アクション</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: create, read, update, delete"
                      disabled={isEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowedRoles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>許可ロール</FormLabel>
                  <FormControl>
                    <RoleCheckboxGroup value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
