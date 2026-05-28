"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/use-auth";
import { useOptions, useToggleOption } from "@/hooks/settings/use-options";
import { usePermissions, useUpdatePermission } from "@/hooks/settings/use-permissions";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SystemSettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mounted flag for hydration
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isLoading && user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [mounted, isLoading, user, router]);

  if (!mounted || isLoading || user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">システム設定</h1>
        <p className="mt-1 text-muted-foreground">
          オプション機能など、システムレベルの設定を管理します
        </p>
      </div>

      <OptionsTab />

      <ShopSellPermissionSection />
    </div>
  );
}

// EC・ショップの create_product 許可ロール。member を含めるか否かで出品可否を切り替える。
const SHOP_SELL_ROLES_WITH_MEMBER = ["owner", "admin", "member"];
const SHOP_SELL_ROLES_STAFF_ONLY = ["owner", "admin"];

function ShopSellPermissionSection() {
  const { data: permissions, isLoading } = usePermissions("ec_shop");
  const update = useUpdatePermission();
  const createPerm = permissions?.find((p) => p.action === "create_product");
  const memberAllowed = createPerm?.allowedRoles.includes("member") ?? false;

  const handleToggle = (next: boolean) => {
    if (!createPerm) return;
    update.mutate({
      id: createPerm.id,
      allowedRoles: next ? SHOP_SELL_ROLES_WITH_MEMBER : SHOP_SELL_ROLES_STAFF_ONLY,
    });
  };

  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <h2 className="text-lg font-semibold">EC・ショップの出品権限</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          メンバーが商品を出品できるかを切り替えます。OFF にすると owner / admin のみ出品できます。
        </p>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-muted-foreground">読み込み中...</p>
      ) : !createPerm ? (
        <p className="py-6 text-center text-muted-foreground">出品権限の設定が見つかりません</p>
      ) : (
        <div className="flex items-center justify-between rounded-md border p-4">
          <div className="space-y-0.5">
            <p className="font-medium">メンバーも出品可能にする</p>
            <p className="text-sm text-muted-foreground">
              {memberAllowed
                ? "現在: すべてのメンバーが出品できます"
                : "現在: owner / admin のみ出品できます"}
            </p>
          </div>
          <Switch
            checked={memberAllowed}
            disabled={update.isPending}
            onCheckedChange={handleToggle}
          />
        </div>
      )}
    </div>
  );
}

// 画面上に表示するオプション機能のホワイトリスト（暫定。仕様確定前につき UI フィルタのみ）
const VISIBLE_OPTION_KEYS = new Set([
  "line_integration",
  "point",
  "advertising",
  "analytics",
  "ec_shop",
  "skill_share",
  "orientation",
]);

function OptionsTab() {
  const { data: options, isLoading } = useOptions();
  const toggle = useToggleOption();
  const [pendingDisable, setPendingDisable] = useState<{
    featureKey: string;
    featureName: string;
  } | null>(null);

  const visibleOptions = options?.filter((opt) => VISIBLE_OPTION_KEYS.has(opt.featureKey));

  const handleToggle = (featureKey: string, featureName: string, nextAvailable: boolean) => {
    if (!nextAvailable) {
      setPendingDisable({ featureKey, featureName });
      return;
    }
    toggle.mutate({ featureKey, isAvailable: true });
  };

  const confirmDisable = () => {
    if (!pendingDisable) return;
    toggle.mutate({ featureKey: pendingDisable.featureKey, isAvailable: false });
    setPendingDisable(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        オプション機能の利用可否を切り替えます。利用不可にすると全ユーザーから該当機能が非表示になります。
      </p>

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">読み込み中...</p>
      ) : !visibleOptions?.length ? (
        <p className="py-12 text-center text-muted-foreground">オプション機能がありません</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>機能名</TableHead>
              <TableHead>説明</TableHead>
              <TableHead className="w-24">状態</TableHead>
              <TableHead className="w-28">利用可否</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleOptions.map((opt) => (
              <TableRow key={opt.featureKey}>
                <TableCell className="font-medium">{opt.featureName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {opt.description ?? "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={opt.isAvailable ? "default" : "outline"}>
                    {opt.isAvailable ? "利用可" : "利用不可"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={opt.isAvailable}
                    disabled={toggle.isPending}
                    onCheckedChange={(next) => handleToggle(opt.featureKey, opt.featureName, next)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={!!pendingDisable}
        onOpenChange={(open) => !open && setPendingDisable(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>オプション機能を利用不可にしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{pendingDisable?.featureName}
              」を利用不可にすると、該当機能が全ユーザーから非表示になります。
              再度利用可能にするまで、関連する画面・API は使用できません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable}>利用不可にする</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
