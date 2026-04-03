"use client";

import { useFeatures } from "@/hooks/use-features";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PermissionFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function PermissionFilter({ value, onChange }: PermissionFilterProps) {
  const { data: features } = useFeatures();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">機能で絞り込み:</span>
      <Select value={value ?? "all"} onValueChange={(v) => onChange(v === "all" ? undefined : v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="すべての機能" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての機能</SelectItem>
          {features?.map((f) => (
            <SelectItem key={f.featureKey} value={f.featureKey}>
              {f.featureName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
