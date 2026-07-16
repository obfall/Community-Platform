"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MembersTable } from "./_components/members-table";
import { MembersFilter } from "./_components/members-filter";
import { PaginationBar } from "@/components/pagination-bar";
import { MemberDetailDialog } from "./_components/member-detail-dialog";
import { useUsers, useExportMembersCsv } from "@/hooks/settings/use-members";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { UserListQuery } from "@/lib/api/types";

export default function MembersSettingsPage() {
  const t = useTranslations("settings.members");
  const [query, setQuery] = useState<UserListQuery>({ page: 1, limit: 20 });
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const { data, isLoading } = useUsers(query);
  const exportCsv = useExportMembersCsv();

  const updateQuery = (partial: Partial<UserListQuery>) => {
    setQuery((prev) => ({ ...prev, ...partial, page: partial.page ?? 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportCsv.mutate(query)}
          disabled={exportCsv.isPending}
        >
          <Download className="mr-2 h-4 w-4" />
          {t("exportCsv")}
        </Button>
      </div>

      <MembersFilter query={query} onQueryChange={updateQuery} />

      <MembersTable
        users={data?.data ?? []}
        isLoading={isLoading}
        onSelectUser={setSelectedUserId}
      />

      {data?.meta && (
        <PaginationBar
          meta={data.meta}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      )}

      <MemberDetailDialog
        userId={selectedUserId}
        open={!!selectedUserId}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(undefined);
        }}
      />
    </div>
  );
}
