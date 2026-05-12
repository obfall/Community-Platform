"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { SearchInput } from "@/components/search-input";
import type { BoardTopic } from "@/lib/api/types";
import { useAuth } from "@/hooks/auth/use-auth";
import { BOARD_VALIDATION } from "./constants";
import {
  useCategories,
  useCreateCategory,
  useReorderCategories,
  useTopicSearchCategoryHits,
} from "@/hooks/board/use-board";
import { BoardScopeProvider, type BoardScope } from "./board-scope";
import { TopicList } from "./topic-list";
import { SortableCategoryItem } from "./sortable-category-item";
import { CreateTopicDialog } from "./create-topic-dialog";

interface BoardViewProps {
  scope: BoardScope;
  heading?: { title: string; description?: string };
}

/**
 * 掲示板のトップビュー（カテゴリ一覧 + トピック一覧 + 作成系ダイアログ一式）。
 * Global/Project/Event の各スコープから同じコンポーネントを呼び出して使う。
 */
export function BoardView({ scope, heading }: BoardViewProps) {
  return (
    <BoardScopeProvider scope={scope}>
      <BoardViewInner heading={heading} />
    </BoardScopeProvider>
  );
}

function BoardViewInner({ heading }: { heading?: { title: string; description?: string } }) {
  const t = useTranslations("board");
  const { isAdmin } = useAuth();
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const reorderCategories = useReorderCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowTopicCreation, setAllowTopicCreation] = useState(true);
  const [topicDialogCategoryId, setTopicDialogCategoryId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const { data: searchOverview, isFetching: searchFetching } = useTopicSearchCategoryHits(
    activeSearch || undefined,
  );

  const categoryList = useMemo(() => categories ?? [], [categories]);

  // 検索 hit したトピックをカテゴリ別にグルーピング（1 回の fetch を分配して N+1 リクエストを防ぐ）
  const topicsByCategory = useMemo(() => {
    const map = new Map<string, BoardTopic[]>();
    if (!searchOverview) return map;
    for (const topic of searchOverview.data) {
      const arr = map.get(topic.category.id) ?? [];
      arr.push(topic);
      map.set(topic.category.id, arr);
    }
    return map;
  }, [searchOverview]);
  const hitCategories = useMemo(
    () => categoryList.filter((c) => topicsByCategory.has(c.id)),
    [topicsByCategory, categoryList],
  );

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {heading && (
          <div>
            <h1 className="text-2xl font-bold">{heading.title}</h1>
            {heading.description && (
              <p className="mt-1 text-muted-foreground">{heading.description}</p>
            )}
          </div>
        )}
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                {t("category.addButton")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("category.createTitle")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">{t("category.nameLabel")}</Label>
                  <Input
                    id="category-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("category.namePlaceholder")}
                    maxLength={BOARD_VALIDATION.categoryNameMaxLength}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">{t("category.descriptionLabel")}</Label>
                  <Input
                    id="category-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("category.descriptionPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("category.allowTopicCreationLabel")}</Label>
                  <RadioGroup
                    value={allowTopicCreation ? "allow" : "deny"}
                    onValueChange={(v) => setAllowTopicCreation(v === "allow")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="allow" id="create-allow" />
                      <Label htmlFor="create-allow" className="font-normal">
                        {t("category.allow")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="deny" id="create-deny" />
                      <Label htmlFor="create-deny" className="font-normal">
                        {t("category.deny")}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!name.trim() || createCategory.isPending}
                  >
                    {createCategory.isPending ? t("category.creating") : t("category.create")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <SearchInput
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={(v) => setActiveSearch(v.trim())}
        placeholder={t("search.placeholder")}
        className="max-w-sm"
      />

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}

      {activeSearch ? (
        searchFetching && !searchOverview ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : hitCategories.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("search.noResults", { query: activeSearch })}
          </p>
        ) : (
          <Accordion
            key={activeSearch}
            type="multiple"
            className="space-y-2"
            defaultValue={hitCategories.map((c) => c.id)}
          >
            {hitCategories.map((cat) => {
              const topics = topicsByCategory.get(cat.id) ?? [];
              return (
                <AccordionItem key={cat.id} value={cat.id} className="rounded-lg border px-4">
                  <div className="flex items-center">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-sm text-muted-foreground">({topics.length})</span>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent>
                    <TopicList categoryId={cat.id} topics={topics} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )
      ) : (
        categoryList.length > 0 &&
        (isAdmin ? (
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
                    canReorder={isAdmin}
                    canManage={isAdmin}
                    onCreateTopic={setTopicDialogCategoryId}
                  />
                ))}
              </Accordion>
            </SortableContext>
          </DndContext>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {categoryList.map((cat) => (
              <AccordionItem key={cat.id} value={cat.id} className="rounded-lg border px-4">
                <div className="flex items-center">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-sm text-muted-foreground">({cat.topicCount})</span>
                    </div>
                  </AccordionTrigger>
                  {cat.allowTopicCreation && (
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTopicDialogCategoryId(cat.id);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        {t("topic.newButton")}
                      </Button>
                    </div>
                  )}
                </div>
                <AccordionContent>
                  <TopicList categoryId={cat.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ))
      )}

      {!activeSearch && categoryList.length === 0 && !isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          {t("empty.noCategories")}
          {isAdmin && t("empty.noCategoriesAdminHint")}
        </div>
      )}

      <CreateTopicDialog
        open={topicDialogCategoryId !== null}
        onOpenChange={(open) => {
          if (!open) setTopicDialogCategoryId(null);
        }}
        defaultCategoryId={topicDialogCategoryId ?? undefined}
      />
    </div>
  );
}
