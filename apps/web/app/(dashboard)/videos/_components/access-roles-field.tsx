"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ROLE_OPTIONS = [
  { value: "admin", label: "管理者 (admin)" },
  { value: "owner", label: "オーナー (owner)" },
  { value: "member", label: "メンバー (member)" },
] as const;

interface Props {
  value: string[];
  onChange: (roles: string[]) => void;
}

export function AccessRolesField({ value, onChange }: Props) {
  const toggle = (role: string) => {
    if (value.includes(role)) {
      onChange(value.filter((r) => r !== role));
    } else {
      onChange([...value, role]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>閲覧可能ロール</Label>
      <div className="flex flex-wrap gap-4">
        {ROLE_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <Checkbox
              id={`role-${opt.value}`}
              checked={value.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
            />
            <Label htmlFor={`role-${opt.value}`} className="text-sm font-normal">
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
