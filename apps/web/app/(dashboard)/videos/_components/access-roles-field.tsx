"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ROLE_VALUES = ["admin", "owner", "member"] as const;

interface Props {
  value: string[];
  onChange: (roles: string[]) => void;
}

export function AccessRolesField({ value, onChange }: Props) {
  const t = useTranslations("videos.accessRolesField");

  const toggle = (role: string) => {
    if (value.includes(role)) {
      onChange(value.filter((r) => r !== role));
    } else {
      onChange([...value, role]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{t("label")}</Label>
      <div className="flex flex-wrap gap-4">
        {ROLE_VALUES.map((role) => (
          <div key={role} className="flex items-center gap-2">
            <Checkbox
              id={`role-${role}`}
              checked={value.includes(role)}
              onCheckedChange={() => toggle(role)}
            />
            <Label htmlFor={`role-${role}`} className="text-sm font-normal">
              {t(`options.${role}`)}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
