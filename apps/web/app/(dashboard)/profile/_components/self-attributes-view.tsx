"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useMyAttributes } from "@/hooks/settings/use-member-attributes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserAttributeValue } from "@/lib/api/types";

export function SelfAttributesView() {
  const { data: attributes, isLoading } = useMyAttributes();

  if (isLoading) return null;

  const editable = attributes?.filter((a) => a.isSelfEditable) ?? [];
  if (!editable.length) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>カスタム属性</CardTitle>
        <Link href="/profile/attributes">
          <Button size="sm" variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            編集
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {editable.map((attr) => (
          <div key={attr.attributeId}>
            <p className="mb-1 text-xs text-muted-foreground">{attr.attributeName}</p>
            <AttributeValueDisplay attr={attr} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AttributeValueDisplay({ attr }: { attr: UserAttributeValue }) {
  const value = attr.value;

  if (value === null || value === "") {
    return <p className="text-muted-foreground">未設定</p>;
  }

  if (attr.type === "multi_select") {
    const items = safeParseStringArray(value);
    if (items === null) return <p>{value}</p>;
    if (items.length === 0) return <p className="text-muted-foreground">未設定</p>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    );
  }

  if (attr.type === "date") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return <p>{date.toLocaleDateString("ja-JP")}</p>;
    }
  }

  return <p className="whitespace-pre-wrap">{value}</p>;
}

function safeParseStringArray(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}
