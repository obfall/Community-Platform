"use client";

import { useTranslations } from "next-intl";
import { ProfileForm } from "../_components/profile-form";

export default function ProfileEditPage() {
  const t = useTranslations("profile");
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("nav.editHeading")}</h2>
      <ProfileForm returnTo="/profile" />
    </div>
  );
}
