"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionsTable } from "./_components/permissions-table";
import { PermissionFilter } from "./_components/permission-filter";
import { PermissionDialog } from "./_components/permission-dialog";

export default function PermissionsSettingsPage() {
  const [featureKeyFilter, setFeatureKeyFilter] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">権限設定</h1>
          <p className="mt-1 text-muted-foreground">各機能のアクションに対する権限を設定します</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          権限を追加
        </Button>
      </div>

      <PermissionFilter value={featureKeyFilter} onChange={setFeatureKeyFilter} />
      <PermissionsTable featureKeyFilter={featureKeyFilter} />
      <PermissionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
