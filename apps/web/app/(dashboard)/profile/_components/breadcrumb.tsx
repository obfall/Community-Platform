"use client";

import { usePathname } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { PROFILE_NAV_ITEMS, PROFILE_SETTINGS_ITEMS } from "@/lib/profile-navigation";

const ALL_ITEMS = [...PROFILE_NAV_ITEMS, ...PROFILE_SETTINGS_ITEMS];

export function ProfileBreadcrumb() {
  const pathname = usePathname();

  const segment = pathname.replace("/profile", "").replace(/^\//, "");
  const current = ALL_ITEMS.find((item) =>
    item.segment === "" ? segment === "" : segment.startsWith(item.segment),
  );

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
