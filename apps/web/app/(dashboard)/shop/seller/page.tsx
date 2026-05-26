"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 販売管理は EC管理（/shop/manage）に統合済み。旧 URL はリダイレクトする。
export default function SellerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/shop/manage");
  }, [router]);

  return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
}
