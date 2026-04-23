"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/use-auth";
import { useOptions, useToggleOption } from "@/hooks/settings/use-options";
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
