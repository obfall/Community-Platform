"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ROLES = [
  { value: "owner", label: "オーナー" },
  { value: "admin", label: "管理者" },
  { value: "moderator", label: "モデレーター" },
  { value: "member", label: "メンバー" },
] as const;

interface RoleCheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function RoleCheckboxGroup({ value, onChange }: RoleCheckboxGroupProps) {
  const handleChange = (role: string, checked: boolean) => {
    if (checked) {
      onChange([...value, role]);
    } else {
      onChange(value.filter((r) => r !== role));
    }
  };

  return (
    <div className="space-y-2">
      {ROLES.map((role) => (
        <div key={role.value} className="flex items-center gap-2">
          <Checkbox
            id={`role-${role.value}`}
            checked={value.includes(role.value)}
            onCheckedChange={(checked) => handleChange(role.value, checked === true)}
          />
          <Label htmlFor={`role-${role.value}`} className="font-normal">
            {role.label}
          </Label>
        </div>
      ))}
    </div>
  );
}
