"use client";

import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileBreadcrumbProps {
  breadcrumb: Array<{ id: string; name: string }>;
  onNavigate: (folderId: string | null) => void;
}

export function FileBreadcrumb({ breadcrumb, onNavigate }: FileBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => onNavigate(null)}>
        <Home className="h-4 w-4" />
        ファイル
      </Button>

      {breadcrumb.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {i === breadcrumb.length - 1 ? (
            <span className="font-medium text-foreground">{item.name}</span>
          ) : (
            <Button variant="ghost" size="sm" className="px-2" onClick={() => onNavigate(item.id)}>
              {item.name}
            </Button>
          )}
        </span>
      ))}
    </nav>
  );
}
