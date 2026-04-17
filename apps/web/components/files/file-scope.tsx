"use client";

import { createContext, useContext, type ReactNode } from "react";

export type FileScope =
  | { kind: "project"; projectId: string }
  | { kind: "event"; eventId: string }
  | { kind: "global" };

const FileScopeContext = createContext<FileScope | null>(null);

export function FileScopeProvider({ scope, children }: { scope: FileScope; children: ReactNode }) {
  return <FileScopeContext.Provider value={scope}>{children}</FileScopeContext.Provider>;
}

export function useFileScope(): FileScope {
  const scope = useContext(FileScopeContext);
  if (!scope) throw new Error("useFileScope must be used within FileScopeProvider");
  return scope;
}

export function fileBasePath(scope: FileScope): string {
  switch (scope.kind) {
    case "project":
      return `/projects/${scope.projectId}/files`;
    case "event":
      return `/events/${scope.eventId}/files`;
    case "global":
      return "/files";
  }
}

export function fileScopeKey(scope: FileScope): readonly unknown[] {
  switch (scope.kind) {
    case "project":
      return ["project", scope.projectId];
    case "event":
      return ["event", scope.eventId];
    case "global":
      return ["global"];
  }
}
