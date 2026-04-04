"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNotificationPreferences, useUpdatePreferences } from "@/hooks/use-notifications";
import type { PreferenceItem } from "@/lib/api/types";

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  board_comment: "掲示板コメント",
  board_like: "掲示板いいね",
  board_post: "掲示板新規投稿",
  system: "システム通知",
};

export function PreferenceForm() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdatePreferences();

  const initialItems = useMemo(
    () =>
      preferences?.map((p) => ({
        notificationType: p.notificationType,
        emailEnabled: p.emailEnabled,
        inAppEnabled: p.inAppEnabled,
        lineEnabled: p.lineEnabled,
      })) ?? [],
    [preferences],
  );

  const [items, setItems] = useState<PreferenceItem[]>([]);
  const displayItems = items.length > 0 ? items : initialItems;

  const toggleItem = (index: number, field: keyof PreferenceItem) => {
    const source = items.length > 0 ? items : initialItems;
    setItems(source.map((item, i) => (i === index ? { ...item, [field]: !item[field] } : item)));
  };

  const handleSave = () => {
    updatePreferences.mutate({ preferences: displayItems });
  };

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (displayItems.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        通知設定はまだありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>通知タイプ</TableHead>
            <TableHead className="text-center">メール</TableHead>
            <TableHead className="text-center">アプリ内</TableHead>
            <TableHead className="text-center">LINE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((item, index) => (
            <TableRow key={item.notificationType}>
              <TableCell>
                {NOTIFICATION_TYPE_LABELS[item.notificationType] ?? item.notificationType}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={item.emailEnabled}
                  onCheckedChange={() => toggleItem(index, "emailEnabled")}
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={item.inAppEnabled}
                  onCheckedChange={() => toggleItem(index, "inAppEnabled")}
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={item.lineEnabled}
                  onCheckedChange={() => toggleItem(index, "lineEnabled")}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updatePreferences.isPending}>
          {updatePreferences.isPending ? "保存中..." : "設定を保存"}
        </Button>
      </div>
    </div>
  );
}
