"use client";

import { useState } from "react";
import Link from "next/link";
import { useSkills } from "@/hooks/skills/use-skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Share2, Clock, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SkillQuery } from "@/lib/api/types";

const FORMAT_LABELS: Record<string, string> = {
  online: "オンライン",
  offline: "オフライン",
  both: "両方",
};

export default function SkillsPage() {
  const [query, setQuery] = useState<SkillQuery>({ page: 1, limit: 12 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSkills(query);
  const skills = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">スキルシェア</h1>
        <Link href="/skills/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            出品
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && setQuery((p) => ({ ...p, search: search || undefined, page: 1 }))
          }
          placeholder="スキルを検索..."
          className="max-w-xs"
        />
        <Select
          value={query.format ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, format: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="形式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="online">オンライン</SelectItem>
            <SelectItem value="offline">オフライン</SelectItem>
            <SelectItem value="both">両方</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : skills.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Share2 className="mx-auto mb-4 h-12 w-12" />
          <p>スキルがありません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <Link key={s.id} href={`/skills/${s.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {FORMAT_LABELS[s.format] ?? s.format}
                    </Badge>
                    {s.category && (
                      <Badge variant="secondary" className="text-xs">
                        {s.category.name}
                      </Badge>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold">{s.title}</h3>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold">¥{s.price.toLocaleString()}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {s.durationMinutes}分
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {s.provider.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{s.provider.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {s.bookingCount}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
            disabled={!meta.hasPreviousPage}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            disabled={!meta.hasNextPage}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
