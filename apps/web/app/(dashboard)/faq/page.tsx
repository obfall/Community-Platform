"use client";

import { useState } from "react";
import Link from "next/link";
import { useFaqArticles, useFaqCategories } from "@/hooks/faq/use-faq";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, HelpCircle } from "lucide-react";
import { HighlightedText } from "@/components/highlighted-text";

export default function FaqPage() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const { data, isLoading } = useFaqArticles({ category, search });
  const { data: categories } = useFaqCategories();
  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FAQ</h1>
        <Link href="/faq/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            作成
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput || undefined)}
          placeholder="FAQを検索..."
          className="max-w-xs"
        />
        <Select
          value={category ?? "all"}
          onValueChange={(v) => setCategory(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのカテゴリ</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <HelpCircle className="mx-auto mb-4 h-12 w-12" />
          <p>FAQがありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((f) => (
            <Link key={f.id} href={`/faq/${f.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {f.category}
                    </Badge>
                    {!f.isPublished && (
                      <Badge variant="secondary" className="text-xs">
                        下書き
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-base font-semibold">
                    <HighlightedText html={f.titleHighlighted} fallback={f.title} />
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    <HighlightedText html={f.snippetHighlighted} fallback={f.body} />
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
