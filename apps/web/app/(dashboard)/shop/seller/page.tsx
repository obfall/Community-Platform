"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// 販売管理は EC管理（/shop/manage）に統合済み。旧 URL はリダイレクトする。
export default function SellerRedirectPage() {
  const t = useTranslations("shop.manage");
  const router = useRouter();

  useEffect(() => {
    router.replace("/shop/manage");
  }, [router]);

  return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;
}
