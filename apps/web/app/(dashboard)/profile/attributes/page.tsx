"use client";

import { useTranslations } from "next-intl";
import { SelfAttributesForm } from "../_components/self-attributes-form";

export default function ProfileAttributesPage() {
  const t = useTranslations("profile");
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("nav.attributesHeading")}</h2>
      <SelfAttributesForm />
    </div>
  );
}
