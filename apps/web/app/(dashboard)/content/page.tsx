"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useContents } from "@/hooks/content/use-content";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText, BookOpen } from "lucide-react";
import { SelectField } from "@/components/select-field";
import { HighlightedText } from "@/components/highlighted-text";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";

const CONTENT_TYPE_KEYS = ["meal_drink", "product", "tourist_spot", "room_space"] as const;
type ContentTypeKey = (typeof CONTENT_TYPE_KEYS)[number];

export default function ContentPage() {
  const t = useTranslations("contents");
  const tCommon = useTranslations("common");
  const [query, setQuery] = useState<{
    page?: number;
    limit?: number;
    search?: string;
    contentType?: string;
    publishStatus?: string;
  }>({ page: 1, limit: 12, publishStatus: "all" });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useContents(query);
  const contents = data?.data ?? [];
  const meta = data?.meta;

  const typeLabel = (type: string) =>
    CONTENT_TYPE_KEYS.includes(type as ContentTypeKey) ? t(`type.${type as ContentTypeKey}`) : type;

  const typeOptions = CONTENT_TYPE_KEYS.map((k) => ({ value: k, label: t(`type.${k}`) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("list.title")}</h1>
        <Link href="/content/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("list.create")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((p) => ({ ...p, search: v || undefined, page: 1 }))}
          placeholder={t("list.searchPlaceholder")}
          className="max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SelectField
            value={query.contentType ?? "all"}
            onChange={(v) =>
              setQuery((p) => ({ ...p, contentType: v === "all" ? undefined : v, page: 1 }))
            }
            options={typeOptions}
            includeAll
            placeholder={t("list.typePlaceholder")}
            className="w-36"
          />
          <SelectField
            value={query.publishStatus ?? "all"}
            onChange={(v) => setQuery((p) => ({ ...p, publishStatus: v, page: 1 }))}
            options={PUBLISH_STATUS_OPTIONS}
            includeAll
            placeholder={t("list.statusPlaceholder")}
            className="w-36"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>
      ) : contents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-4 h-12 w-12" />
          <p>{t("list.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contents.map((c) => (
            <Link key={c.id} href={`/content/${c.id}`}>
              <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                <div className="flex h-36 items-center justify-center bg-muted">
                  {c.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverImageUrl}
                      alt={c.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {typeLabel(c.contentType)}
                    </Badge>
                    <Badge
                      variant={c.publishStatus === "published" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {t(`status.${c.publishStatus}`)}
                    </Badge>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold">
                    <HighlightedText html={c.titleHighlighted} fallback={c.name} />
                  </h3>
                  {(c.snippetHighlighted || c.description) && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      <HighlightedText html={c.snippetHighlighted} fallback={c.description ?? ""} />
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{c.createdBy.name}</span>
                    {c.price != null && (
                      <span className="font-semibold text-foreground">
                        &yen;{c.price.toLocaleString()}
                      </span>
                    )}
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
