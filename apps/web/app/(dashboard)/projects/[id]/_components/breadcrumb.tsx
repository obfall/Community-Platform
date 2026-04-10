"use client";

import { useProject } from "@/hooks/projects/use-projects";
import { Breadcrumb } from "@/components/breadcrumb";

interface ProjectDetailBreadcrumbProps {
  projectId: string;
}

export function ProjectDetailBreadcrumb({ projectId }: ProjectDetailBreadcrumbProps) {
  const { data: project } = useProject(projectId);

  return (
    <Breadcrumb
      items={[{ label: "プロジェクト", href: "/projects" }, { label: project?.name ?? "..." }]}
    />
  );
}
