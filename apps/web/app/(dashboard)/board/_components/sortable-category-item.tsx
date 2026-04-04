"use client";

import { useState } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Pencil, Trash2 } from "lucide-react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUpdateCategory, useDeleteCategory } from "@/hooks/use-board";
import { TopicList } from "./topic-list";
import type { BoardCategory } from "@/lib/api/types";

interface SortableCategoryItemProps {
  category: BoardCategory;
  canReorder: boolean;
  canManage: boolean;
}

export function SortableCategoryItem({
  category,
  canReorder,
  canManage,
}: SortableCategoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editDescription, setEditDescription] = useState(category.description ?? "");
  const [editAllowTopicCreation, setEditAllowTopicCreation] = useState(category.allowTopicCreation);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: "relative" as const,
  };

  const handleEdit = () => {
    if (!editName.trim()) return;
    updateCategory.mutate(
      {
        id: category.id,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          allowTopicCreation: editAllowTopicCreation,
        },
      },
      { onSuccess: () => setEditOpen(false) },
    );
  };

  const handleDelete = () => {
    if (!confirm("このカテゴリを削除しますか？")) return;
    deleteCategory.mutate(category.id);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={category.id} className="rounded-lg border px-4">
        <div className="flex items-center">
          {canReorder && (
            <div
              className="cursor-grab touch-none py-4 pr-2 text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-medium">{category.name}</span>
              <span className="text-sm text-muted-foreground">({category.postCount})</span>
            </div>
          </AccordionTrigger>
          {canManage && (
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(category.name);
                  setEditDescription(category.description ?? "");
                  setEditAllowTopicCreation(category.allowTopicCreation);
                  setEditOpen(true);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                編集
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                削除
              </Button>
            </div>
          )}
        </div>
        <AccordionContent>
          {category.allowTopicCreation && (
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/board/topics/new?categoryId=${category.id}`}>
                  <Plus className="mr-1 h-4 w-4" />
                  新規トピック
                </Link>
              </Button>
            </div>
          )}
          <TopicList categoryId={category.id} isAdmin={canReorder} />
        </AccordionContent>
      </AccordionItem>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${category.id}`}>カテゴリ名</Label>
              <Input
                id={`edit-name-${category.id}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-desc-${category.id}`}>説明（任意）</Label>
              <Input
                id={`edit-desc-${category.id}`}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="カテゴリの説明"
              />
            </div>
            <div className="space-y-2">
              <Label>トピック作成</Label>
              <RadioGroup
                value={editAllowTopicCreation ? "allow" : "deny"}
                onValueChange={(v) => setEditAllowTopicCreation(v === "allow")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="allow" id={`edit-allow-${category.id}`} />
                  <Label htmlFor={`edit-allow-${category.id}`} className="font-normal">
                    可
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deny" id={`edit-deny-${category.id}`} />
                  <Label htmlFor={`edit-deny-${category.id}`} className="font-normal">
                    不可
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleEdit} disabled={!editName.trim() || updateCategory.isPending}>
                {updateCategory.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
