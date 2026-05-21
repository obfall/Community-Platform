"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSkills } from "@/hooks/skills/use-skills";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SelectField } from "@/components/select-field";
import { Plus, Share2, Clock, Users, CalendarClock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HighlightedText } from "@/components/highlighted-text";
import type { SkillQuery } from "@/lib/api/types";

const FORMAT_VALUES = ["online", "offline", "both"] as const;

export default function SkillsPage() {
  const t = useTranslations("skills");
  const tFormat = useTranslations("skills.format");
  const [query, setQuery] = useState<SkillQuery>({ page: 1, limit: 12 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSkills(query);
  const skills = data?.data ?? [];
  const meta = data?.meta;

  const formatOptions = FORMAT_VALUES.map((value) => ({ value, label: tFormat(value) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("heading.title")}</h1>
        <div className="flex items-center gap-2">
          <Link href="/skills/bookings">
            <Button variant="outline">
              <CalendarClock className="mr-2 h-4 w-4" />
              {t("heading.bookings")}
            </Button>
          </Link>
          <Link href="/skills/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("heading.new")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((p) => ({ ...p, search: v || undefined, page: 1 }))}
          placeholder={t("search.placeholder")}
          className="max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SelectField
            value={query.format ?? "all"}
            onChange={(v) =>
              setQuery((p) => ({ ...p, format: v === "all" ? undefined : v, page: 1 }))
            }
            options={formatOptions}
            includeAll
            placeholder={t("search.formatPlaceholder")}
            className="w-36"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("list.loading")}</div>
      ) : skills.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Share2 className="mx-auto mb-4 h-12 w-12" />
          <p>{t("list.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <Link key={s.id} href={`/skills/${s.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {isFormatKey(s.format) ? tFormat(s.format) : s.format}
                    </Badge>
                    {s.category && (
                      <Badge variant="secondary" className="text-xs">
                        {s.category.name}
                      </Badge>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold">
                    <HighlightedText html={s.titleHighlighted} fallback={s.title} />
                  </h3>
                  {(s.snippetHighlighted || s.description) && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      <HighlightedText html={s.snippetHighlighted} fallback={s.description ?? ""} />
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold">¥{s.price.toLocaleString()}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {t("list.duration", { minutes: s.durationMinutes })}
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

      {meta && (
        <PaginationBar meta={meta} onPageChange={(page) => setQuery((p) => ({ ...p, page }))} />
      )}
    </div>
  );
}

function isFormatKey(v: string): v is (typeof FORMAT_VALUES)[number] {
  return (FORMAT_VALUES as readonly string[]).includes(v);
}
