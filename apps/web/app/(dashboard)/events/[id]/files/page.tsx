"use client";

import { use } from "react";
import { FileManagerView } from "@/components/files/file-manager-view";

export default function EventFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FileManagerView scope={{ kind: "event", eventId: id }} />;
}
