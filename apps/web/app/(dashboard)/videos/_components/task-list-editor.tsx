"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import type { TaskInput } from "@/lib/api/types";

interface Props {
  value: TaskInput[];
  onChange: (tasks: TaskInput[]) => void;
}

export function TaskListEditor({ value, onChange }: Props) {
  const addTask = () => {
    onChange([...value, { title: "", sortOrder: value.length }]);
  };

  const updateTask = (index: number, patch: Partial<TaskInput>) => {
    onChange(value.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const removeTask = (index: number) => {
    onChange(value.filter((_, i) => i !== index).map((t, i) => ({ ...t, sortOrder: i })));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    const temp = next[index - 1]!;
    next[index - 1] = next[index]!;
    next[index] = temp;
    onChange(next.map((t, i) => ({ ...t, sortOrder: i })));
  };

  const moveDown = (index: number) => {
    if (index >= value.length - 1) return;
    const next = [...value];
    const temp = next[index]!;
    next[index] = next[index + 1]!;
    next[index + 1] = temp;
    onChange(next.map((t, i) => ({ ...t, sortOrder: i })));
  };

  return (
    <div className="space-y-3">
      <Label>タスク（視聴後に行う作業）</Label>
      {value.map((task, idx) => (
        <div key={task.id ?? `new-${idx}`} className="rounded-md border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="タスクタイトル"
                value={task.title}
                onChange={(e) => updateTask(idx, { title: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => moveDown(idx)}
                disabled={idx >= value.length - 1}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeTask(idx)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input
            placeholder="説明（任意）"
            value={task.description ?? ""}
            onChange={(e) => updateTask(idx, { description: e.target.value || undefined })}
          />
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={addTask}>
        <Plus className="mr-1 h-4 w-4" />
        タスクを追加
      </Button>
    </div>
  );
}
