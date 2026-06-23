"use client";

import { useTranslations } from "next-intl";
import { PublicInfoForm } from "../_components/public-info-form";

export default function ProfilePublicInfoPage() {
  const t = useTranslations("profile");
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("nav.publicInfoHeading")}</h2>
      <PublicInfoForm returnTo="/profile" />
    </div>
  );
}
