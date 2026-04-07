"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // hydration mismatch 回避のため、マウント後にフラグを立てる
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [mounted, isLoading, isAdmin, router]);

  // SSR / 初回マウント前は何も描画しない（hydration mismatch 回避）
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
