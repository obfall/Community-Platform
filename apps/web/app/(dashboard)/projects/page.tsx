"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProjects } from "@/hooks/projects/use-projects";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { SelectField } from "@/components/select-field";
import { PaginationBar } from "@/components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FolderKanban, Users, CalendarDays, X } from "lucide-react";
import { HighlightedText } from "@/components/highlighted-text";
import type { ProjectListItem, ProjectQuery } from "@/lib/api/types";
import { PROJECT_STATUS_VALUES, PROJECT_STATUS_VARIANTS } from "@/lib/projects/project-status";

export default function ProjectsPage() {
  const { user } = useAuth();
  const t = useTranslations("projects");
  const tStatus = useTranslations("enums.projectStatus");
  const [query, setQuery] = useState<ProjectQuery>({ page: 1, limit: 12 });
  const [search, setSearch] = useState("");
  // 現在絞り込み中のタグ名を保持（API レスポンスからではなくクリック時に確定するため）
  const [activeTagName, setActiveTagName] = useState<string | null>(null);
  const { data, isLoading } = useProjects(query);
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const projects = data?.data ?? [];
  const meta = data?.meta;

  const statusFilterOptions = PROJECT_STATUS_VALUES.map((value) => ({
    value,
    label: tStatus(value),
  }));

  const handleTagClick = (tagId: string, tagName: string) => {
    setActiveTagName(tagName);
    setQuery((prev) => ({ ...prev, tagId, page: 1 }));
  };

  const clearTagFilter = () => {
    setActiveTagName(null);
    setQuery((prev) => ({ ...prev, tagId: undefined, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("heading.title")}</h1>
        {isAdmin && (
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("heading.newButton")}
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((prev) => ({ ...prev, search: v || undefined, page: 1 }))}
          placeholder={t("search.placeholder")}
        />
        <SelectField
          value={query.status ?? "all"}
          onChange={(v) =>
            setQuery((prev) => ({ ...prev, status: v === "all" ? undefined : v, page: 1 }))
          }
          options={statusFilterOptions}
          includeAll
          placeholder={t("search.statusPlaceholder")}
          className="w-32"
        />
      </div>

      {query.tagId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("search.tagFilterLabel")}</span>
          <Badge variant="secondary" className="gap-1">
            {activeTagName ?? query.tagId}
            <button
              type="button"
              onClick={clearTagFilter}
              className="rounded-sm hover:bg-muted-foreground/20"
              aria-label={t("search.tagFilterClear")}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("list.loading")}</div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FolderKanban className="mx-auto mb-4 h-12 w-12" />
          <p>{t("list.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: ProjectListItem) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                <div className="relative h-32 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.coverImageUrl ?? "/images/project-placeholder.svg"}
                    alt={project.name}
                    className="h-full w-full object-cover"
                  />
                  <Badge
                    variant={PROJECT_STATUS_VARIANTS[project.status] ?? "secondary"}
                    className={`absolute top-2 left-2 shadow ${
                      PROJECT_STATUS_VARIANTS[project.status] === "outline" ? "bg-background" : ""
                    }`}
                  >
                    {tStatus(project.status)}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  {(project.category || (project.tags?.length ?? 0) > 0) && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {project.category && <Badge variant="outline">{project.category.name}</Badge>}
                      {project.tags?.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={(e) => {
                            e.preventDefault();
                            handleTagClick(tag.id, tag.name);
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <h3 className="mb-1 line-clamp-2 text-sm font-semibold">
                    <HighlightedText html={project.titleHighlighted} fallback={project.name} />
                  </h3>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {project.startDate && (
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(project.startDate).toLocaleDateString("ja-JP")}
                        {project.endDate &&
                          ` 〜 ${new Date(project.endDate).toLocaleDateString("ja-JP")}`}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {t("list.memberCount", { count: project.memberCount })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {meta && (
        <PaginationBar
          meta={meta}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      )}
    </div>
  );
}
