"use client";

import { useTranslations } from "next-intl";
import { useProject } from "@/hooks/projects/use-projects";
import { Breadcrumb } from "@/components/breadcrumb";

interface ProjectDetailBreadcrumbProps {
  projectId: string;
}

export function ProjectDetailBreadcrumb({ projectId }: ProjectDetailBreadcrumbProps) {
  const t = useTranslations("projects.breadcrumb");
  const { data: project } = useProject(projectId);

  return (
    <Breadcrumb
      items={[{ label: t("root"), href: "/projects" }, { label: project?.name ?? "..." }]}
    />
  );
}
