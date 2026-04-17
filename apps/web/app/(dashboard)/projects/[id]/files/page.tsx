"use client";

import { use } from "react";
import { FileManagerView } from "@/components/files/file-manager-view";

export default function ProjectFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FileManagerView scope={{ kind: "project", projectId: id }} />;
}
