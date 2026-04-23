"use client";

import { usePathname } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { PROFILE_NAV_ITEMS, PROFILE_SETTINGS_ITEMS } from "@/lib/profile-navigation";

const ALL_ITEMS = [...PROFILE_NAV_ITEMS, ...PROFILE_SETTINGS_ITEMS];

const EXTRA_LABELS: Record<string, string> = {
  edit: "プロフィール編集",
  "public-info": "公開情報編集",
  attributes: "カスタム属性編集",
};

export function ProfileBreadcrumb() {
  const pathname = usePathname();

  const segment = pathname.replace("/profile", "").replace(/^\//, "");
  const current = ALL_ITEMS.find((item) =>
    item.segment === "" ? segment === "" : segment.startsWith(item.segment),
  );

  const extraLabel = EXTRA_LABELS[segment];

  if (extraLabel) {
    return (
      <Breadcrumb
        items={[
          { label: "ホーム", href: "/dashboard" },
          { label: "マイページ", href: "/profile" },
          { label: extraLabel },
        ]}
      />
    );
  }

  if (current && current.segment !== "") {
    return (
      <Breadcrumb
        items={[
          { label: "ホーム", href: "/dashboard" },
          { label: "マイページ", href: "/profile" },
          { label: current.label },
        ]}
      />
    );
  }

  return <Breadcrumb items={[{ label: "ホーム", href: "/dashboard" }, { label: "マイページ" }]} />;
}
