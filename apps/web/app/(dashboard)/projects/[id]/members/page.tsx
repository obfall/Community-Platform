"use client";

import { use } from "react";
import { useProject } from "@/hooks/use-projects";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export default function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project } = useProject(id);

  if (!project) return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">メンバー ({project.memberCount})</h2>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{m.name}</span>
                <Badge variant="outline" className="ml-auto">
                  {m.role === "admin" ? "管理者" : "メンバー"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
