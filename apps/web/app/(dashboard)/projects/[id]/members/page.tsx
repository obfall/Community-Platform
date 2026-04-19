"use client";

import { use } from "react";
import { useProject } from "@/hooks/projects/use-projects";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectMember } from "@/lib/api/types";

export default function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project } = useProject(id);

  if (!project) return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">メンバー ({project.memberCount})</h2>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead className="w-28">ロール</TableHead>
              <TableHead className="w-36">参加日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.members.map((m: ProjectMember) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
                      <AvatarFallback className="text-xs">{m.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{m.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={m.role === "admin" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {m.role === "admin" ? "管理者" : "メンバー"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(m.joinedAt).toLocaleDateString("ja-JP")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
