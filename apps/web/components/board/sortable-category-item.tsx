"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Pencil, Trash2, MoreVertical } from "lucide-react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUpdateCategory, useDeleteCategory } from "@/hooks/board/use-board";
import { TopicList } from "./topic-list";
import { BOARD_VALIDATION } from "./constants";
import type { BoardCategory } from "@/lib/api/types";

interface SortableCategoryItemProps {
  category: BoardCategory;
  canReorder: boolean;
  canManage: boolean;
  onCreateTopic: (categoryId: string) => void;
}

export function SortableCategoryItem({
  category,
  canReorder,
  canManage,
  onCreateTopic,
}: SortableCategoryItemProps) {
  const t = useTranslations("board");
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
    if (!confirm(t("confirm.deleteCategory"))) return;
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
              <span className="text-sm text-muted-foreground">({category.topicCount})</span>
            </div>
          </AccordionTrigger>
          {(category.allowTopicCreation || canManage) && (
            <div className="ml-auto flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">{t("menu.open")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {category.allowTopicCreation && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateTopic(category.id);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("topic.newButton")}
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditName(category.name);
                          setEditDescription(category.description ?? "");
                          setEditAllowTopicCreation(category.allowTopicCreation);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("menu.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("menu.delete")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <AccordionContent>
          <TopicList categoryId={category.id} isAdmin={canReorder} />
        </AccordionContent>
      </AccordionItem>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("category.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${category.id}`}>{t("category.nameLabel")}</Label>
              <Input
                id={`edit-name-${category.id}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={BOARD_VALIDATION.categoryNameMaxLength}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-desc-${category.id}`}>{t("category.descriptionLabel")}</Label>
              <Input
                id={`edit-desc-${category.id}`}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t("category.descriptionPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("category.allowTopicCreationLabel")}</Label>
              <RadioGroup
                value={editAllowTopicCreation ? "allow" : "deny"}
                onValueChange={(v) => setEditAllowTopicCreation(v === "allow")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="allow" id={`edit-allow-${category.id}`} />
                  <Label htmlFor={`edit-allow-${category.id}`} className="font-normal">
                    {t("category.allow")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deny" id={`edit-deny-${category.id}`} />
                  <Label htmlFor={`edit-deny-${category.id}`} className="font-normal">
                    {t("category.deny")}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleEdit} disabled={!editName.trim() || updateCategory.isPending}>
                {updateCategory.isPending ? t("category.saving") : t("category.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
