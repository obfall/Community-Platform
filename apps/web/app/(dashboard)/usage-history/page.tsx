"use client";

import { AdminGuard } from "@/components/admin-guard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityLogTab } from "./_components/activity-log-tab";
import { LoginHistoryTab } from "./_components/login-history-tab";

export default function UsageHistoryPage() {
  return (
    <AdminGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">利用履歴</h1>
          <p className="mt-1 text-muted-foreground">操作ログとログイン履歴を確認できます</p>
        </div>

        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">操作ログ</TabsTrigger>
            <TabsTrigger value="login">ログイン履歴</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="pt-4">
            <ActivityLogTab />
          </TabsContent>

          <TabsContent value="login" className="pt-4">
            <LoginHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
