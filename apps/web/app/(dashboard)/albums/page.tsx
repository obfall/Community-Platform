"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAlbums, useAlbumCategories, useCreateAlbumCategory } from "@/hooks/albums/use-albums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Image as ImageIcon, Camera } from "lucide-react";
import { HighlightedText } from "@/components/highlighted-text";

export default function AlbumsPage() {
  const t = useTranslations("albums");
  const tCommon = useTranslations("common");
  const [query, setQuery] = useState<{
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
  }>({
    page: 1,
    limit: 12,
  });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAlbums(query);
  const { data: categories } = useAlbumCategories();
  const createCategory = useCreateAlbumCategory();
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const albums = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("list.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            {t("list.addCategory")}
          </Button>
          <Link href="/albums/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("list.create")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((p) => ({ ...p, search: v || undefined, page: 1 }))}
          placeholder={t("list.searchPlaceholder")}
          className="max-w-xs"
        />
        <Select
          value={query.categoryId ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, categoryId: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("list.categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("list.categoryAll")}</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("categoryDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("categoryDialog.nameLabel")}</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t("categoryDialog.namePlaceholder")}
              />
            </div>
            <Button
              className="w-full"
              disabled={!newCatName || createCategory.isPending}
              onClick={() => {
                createCategory.mutate(newCatName, {
                  onSuccess: () => {
                    setCatDialogOpen(false);
                    setNewCatName("");
                  },
                });
              }}
            >
              {t("categoryDialog.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>
      ) : albums.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ImageIcon className="mx-auto mb-4 h-12 w-12" />
          <p>{t("list.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums.map((a) => (
            <Link key={a.id} href={`/albums/${a.id}`}>
              <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                <div className="flex h-40 items-center justify-center bg-muted">
                  {a.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.coverPhotoUrl}
                      alt={a.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    {a.category && (
                      <Badge variant="secondary" className="text-xs">
                        {a.category.name}
                      </Badge>
                    )}
                    {a.publishStatus === "draft" && (
                      <Badge variant="outline" className="text-xs">
                        {t("status.draft")}
                      </Badge>
                    )}
                    {a.publishStatus === "unpublished" && (
                      <Badge variant="outline" className="text-xs">
                        {t("status.unpublished")}
                      </Badge>
                    )}
                  </div>
                  <h3 className="line-clamp-1 text-sm font-semibold">
                    <HighlightedText html={a.titleHighlighted} fallback={a.title} />
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {t("list.photoCount", { count: a.photoCount })}
                    </span>
                    <span>{a.createdBy.name}</span>
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
