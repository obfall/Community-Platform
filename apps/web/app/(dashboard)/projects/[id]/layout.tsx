"use client";

import { use } from "react";
import { ProjectBreadcrumb } from "@/components/project-breadcrumb";

export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div>
      <ProjectBreadcrumb projectId={id} />
      {children}
    </div>
  );
}
