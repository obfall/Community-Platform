"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FolderKanban, Users } from "lucide-react";
import type { ProjectListItem, ProjectQuery } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  completed: "完了",
  cancelled: "中止",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_started: "secondary",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
};

export default function ProjectsPage() {
  const [query, setQuery] = useState<ProjectQuery>({ page: 1, limit: 12 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProjects(query);

  const projects = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">プロジェクト</h1>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            setQuery((prev) => ({ ...prev, search: search || undefined, page: 1 }))
          }
          placeholder="プロジェクトを検索..."
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FolderKanban className="mx-auto mb-4 h-12 w-12" />
          <p>プロジェクトがありません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: ProjectListItem) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                {project.coverImageUrl && (
                  <div className="h-32 overflow-hidden rounded-t-lg bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.coverImageUrl}
                      alt={project.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[project.status] ?? "secondary"}>
                      {STATUS_LABELS[project.status] ?? project.status}
                    </Badge>
                    {project.category && <Badge variant="outline">{project.category.name}</Badge>}
                  </div>
                  <h3 className="mb-1 line-clamp-2 text-sm font-semibold">{project.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {project.memberCount}人
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
            onClick={() =>
              setQuery((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))
            }
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
            onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
            disabled={!meta.hasNextPage}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
