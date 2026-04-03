"use client";

import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold">ようこそ{user?.name ? `、${user.name}さん` : ""}</h1>
      <p className="mt-2 text-muted-foreground">
        ダッシュボードの内容は今後のフェーズで追加されます。
      </p>
    </div>
  );
}
