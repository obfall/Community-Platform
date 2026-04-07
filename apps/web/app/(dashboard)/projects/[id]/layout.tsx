"use client";

import { use } from "react";
import { ProjectDetailBreadcrumb } from "./_components/breadcrumb";

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
      <ProjectDetailBreadcrumb projectId={id} />
      {children}
    </div>
  );
}
