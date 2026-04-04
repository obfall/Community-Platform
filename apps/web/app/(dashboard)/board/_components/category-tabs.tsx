"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BoardCategory } from "@/lib/api/types";

interface CategoryTabsProps {
  categories: BoardCategory[];
  selectedId: string | undefined;
  onSelect: (categoryId: string | undefined) => void;
}

export function CategoryTabs({ categories, selectedId, onSelect }: CategoryTabsProps) {
  return (
    <Tabs value={selectedId ?? "all"} onValueChange={(v) => onSelect(v === "all" ? undefined : v)}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="all">すべて</TabsTrigger>
        {categories.map((cat) => (
          <TabsTrigger key={cat.id} value={cat.id}>
            {cat.name}
            <span className="ml-1 text-xs text-muted-foreground">({cat.postCount})</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
