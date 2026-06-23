"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMyAttributes, useSetMyAttributes } from "@/hooks/settings/use-member-attributes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserAttributeValue } from "@/lib/api/types";

export function SelfAttributesForm() {
  const tCommon = useTranslations("common");
  const { data: attributes, isLoading } = useMyAttributes();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {tCommon("loading")}
        </CardContent>
      </Card>
    );
  }

  const editable = attributes?.filter((a) => a.isSelfEditable) ?? [];
  if (!editable.length) return null;

  return <SelfAttributesFormInner attributes={editable} />;
}

function SelfAttributesFormInner({ attributes }: { attributes: UserAttributeValue[] }) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const setMutation = useSetMyAttributes();

  // 編集中の上書き値のみ管理。未編集の属性はサーバ値をそのまま表示する。
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});

  const getValue = (attr: UserAttributeValue): string =>
    (attr.attributeId in overrides ? overrides[attr.attributeId] : attr.value) ?? "";

  const setValue = (attributeId: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [attributeId]: value }));
  };

  const handleSave = () => {
    const items = attributes.map((attr) => ({
      attributeId: attr.attributeId,
      value: attr.attributeId in overrides ? (overrides[attr.attributeId] ?? null) : attr.value,
    }));
    setMutation.mutate(items, {
      onSuccess: () => {
        setOverrides({});
        router.push("/profile");
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("attributesForm.title")}</CardTitle>
        <CardDescription>{t("attributesForm.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attributes.map((attr) => (
          <div key={attr.attributeId} className="space-y-1">
            <Label>{attr.attributeName}</Label>
            <AttributeField
              attr={attr}
              value={getValue(attr)}
              onChange={(v) => setValue(attr.attributeId, v)}
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/profile")}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={setMutation.isPending}>
            {setMutation.isPending ? t("attributesForm.saving") : tCommon("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AttributeField({
  attr,
  value,
  onChange,
}: {
  attr: UserAttributeValue;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("profile");
  switch (attr.type) {
    case "text":
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "date":
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={t("attributesForm.selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {attr.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multi_select": {
      const selected: string[] = value ? (JSON.parse(value) as string[]) : [];
      const toggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt];
        onChange(JSON.stringify(next));
      };
      return (
        <div className="flex flex-wrap gap-3">
          {attr.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}
