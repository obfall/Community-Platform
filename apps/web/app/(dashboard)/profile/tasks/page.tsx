"use client";

import Link from "next/link";
import { useMyTasks } from "@/hooks/members/use-members";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Clock, FolderKanban } from "lucide-react";
import type { MyTaskItem } from "@/lib/api/types";

function getProgressLabel(progress: number) {
  if (progress === 0) return "未着手";
  if (progress === 100) return "完了";
  return `${progress}%`;
}

function getProgressVariant(progress: number): "default" | "secondary" | "outline" {
  if (progress === 100) return "default";
  if (progress > 0) return "secondary";
  return "outline";
}

export default function ProfileTasksPage() {
  const { data: tasks, isLoading } = useMyTasks();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">マイタスク</h2>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CheckSquare className="mx-auto mb-4 h-12 w-12" />
          <p>担当タスクはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: MyTaskItem) => (
            <Link key={task.id} href={`/projects/${task.project.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{task.title}</p>
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {task.project.name}
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            期限:{" "}
                            {new Date(task.dueDate).toLocaleDateString("ja-JP", {
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={getProgressVariant(task.progress)} className="shrink-0 text-xs">
                      {getProgressLabel(task.progress)}
                    </Badge>
                  </div>
                  {task.progress > 0 && task.progress < 100 && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
