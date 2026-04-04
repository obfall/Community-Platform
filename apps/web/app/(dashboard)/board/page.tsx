"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";
import { useCategories, useCreateCategory, useReorderCategories } from "@/hooks/use-board";
import { TopicList } from "./_components/topic-list";
import { SortableCategoryItem } from "./_components/sortable-category-item";

export default function BoardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const canManage = user?.role === "owner" || user?.role === "admin" || user?.role === "moderator";
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const reorderCategories = useReorderCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowTopicCreation, setAllowTopicCreation] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleCreateCategory = () => {
    if (!name.trim()) return;
    createCategory.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        allowTopicCreation,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setAllowTopicCreation(true);
          setDialogOpen(false);
        },
      },
    );
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    const items = reordered.map((cat, index) => ({
      id: cat.id,
      sortOrder: index,
    }));
    reorderCategories.mutate({ items });
  };

  const categoryList = categories ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">掲示板</h1>
          <p className="mt-1 text-muted-foreground">コミュニティの掲示板</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                カテゴリ追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>カテゴリを作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">カテゴリ名</Label>
                  <Input
                    id="category-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: お知らせ"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">説明（任意）</Label>
                  <Input
                    id="category-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="カテゴリの説明"
                  />
                </div>
                <div className="space-y-2">
                  <Label>トピック作成</Label>
                  <RadioGroup
                    value={allowTopicCreation ? "allow" : "deny"}
                    onValueChange={(v) => setAllowTopicCreation(v === "allow")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="allow" id="create-allow" />
                      <Label htmlFor="create-allow" className="font-normal">
                        可
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="deny" id="create-deny" />
                      <Label htmlFor="create-deny" className="font-normal">
                        不可
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!name.trim() || createCategory.isPending}
                  >
                    {createCategory.isPending ? "作成中..." : "作成"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}

      {categoryList.length > 0 &&
        (canManage ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={categoryList.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Accordion type="multiple" className="space-y-2">
                {categoryList.map((cat) => (
                  <SortableCategoryItem
                    key={cat.id}
                    category={cat}
                    canReorder={canManage}
                    canManage={canManage}
                  />
                ))}
              </Accordion>
            </SortableContext>
          </DndContext>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {categoryList.map((cat) => (
              <AccordionItem key={cat.id} value={cat.id} className="rounded-lg border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-sm text-muted-foreground">({cat.postCount})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {cat.allowTopicCreation && (
                    <div className="mb-3 flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/board/topics/new?categoryId=${cat.id}`}>
                          <Plus className="mr-1 h-4 w-4" />
                          新規トピック
                        </Link>
                      </Button>
                    </div>
                  )}
                  <TopicList categoryId={cat.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ))}

      {categoryList.length === 0 && !isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          カテゴリがまだありません
          {isAdmin && "。上の「カテゴリ追加」ボタンから作成してください。"}
        </div>
      )}
    </div>
  );
}
