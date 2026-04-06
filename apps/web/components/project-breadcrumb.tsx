"use client";

import { useProject } from "@/hooks/use-projects";
import { Breadcrumb } from "@/components/breadcrumb";

interface ProjectBreadcrumbProps {
  projectId: string;
}

export function ProjectBreadcrumb({ projectId }: ProjectBreadcrumbProps) {
  const { data: project } = useProject(projectId);

  return (
    <Breadcrumb
      items={[{ label: "プロジェクト", href: "/projects" }, { label: project?.name ?? "..." }]}
    />
  );
}
