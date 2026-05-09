"use client";

import Link from "next/link";
import { useMyTasks } from "@/hooks/profile/use-tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Clock, FolderKanban } from "lucide-react";
import type { MyTaskItem, VideoTaskStatus } from "@/lib/api/types";

const STATUS_LABEL: Record<VideoTaskStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  completed: "完了",
};

function statusVariant(status: VideoTaskStatus): "default" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "in_progress") return "secondary";
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
                      <p
                        className={`text-sm font-semibold ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                      >
                        {task.title}
                      </p>
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
                    <Badge variant={statusVariant(task.status)} className="shrink-0 text-xs">
                      {STATUS_LABEL[task.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
