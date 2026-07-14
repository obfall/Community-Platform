"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/breadcrumb";
import { PROFILE_NAV_ITEMS, PROFILE_SETTINGS_ITEMS } from "@/lib/profile-navigation";

const ALL_ITEMS = [...PROFILE_NAV_ITEMS, ...PROFILE_SETTINGS_ITEMS];

// segment → profile.json の nav.* キー（編集系の見出し）
const EXTRA_LABEL_KEYS: Record<string, string> = {
  edit: "editHeading",
  "public-info": "publicInfoHeading",
  attributes: "attributesHeading",
};

export function ProfileBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("profile");

  const segment = pathname.replace("/profile", "").replace(/^\//, "");
  const current = ALL_ITEMS.find((item) =>
    item.segment === "" ? segment === "" : segment.startsWith(item.segment),
  );

  const extraLabelKey = EXTRA_LABEL_KEYS[segment];

  if (extraLabelKey) {
    return (
      <Breadcrumb
        items={[
          { label: t("nav.home"), href: "/dashboard" },
          { label: t("nav.myPage"), href: "/profile" },
          { label: t(`nav.${extraLabelKey}`) },
        ]}
      />
    );
  }

  if (current && current.segment !== "") {
    return (
      <Breadcrumb
        items={[
          { label: t("nav.home"), href: "/dashboard" },
          { label: t("nav.myPage"), href: "/profile" },
          { label: t(`nav.${current.labelKey}`) },
        ]}
      />
    );
  }

  return (
    <Breadcrumb
      items={[{ label: t("nav.home"), href: "/dashboard" }, { label: t("nav.myPage") }]}
    />
  );
}
