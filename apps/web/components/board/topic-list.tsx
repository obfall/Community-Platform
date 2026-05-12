"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  GripVertical,
  MessageCircle,
  Eye,
  Pin,
  PinOff,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HighlightedText } from "@/components/highlighted-text";
import { useAuth } from "@/hooks/auth/use-auth";
import {
  useTopics,
  useReorderTopics,
  useDeleteTopic,
  useToggleTopicPin,
} from "@/hooks/board/use-board";
import { useBoardPaths } from "./board-scope";
import { EditTopicDialog } from "./edit-topic-dialog";
import { BOARD_LIMITS } from "./constants";
import type { BoardTopic } from "@/lib/api/types";

export function SortableTopicItem({ topic, isAdmin }: { topic: BoardTopic; isAdmin: boolean }) {
  const t = useTranslations("board");
  const paths = useBoardPaths();
  const { isAdmin: userIsAdmin, canEditAuthor } = useAuth();
  const togglePin = useToggleTopicPin();
  const deleteTopic = useDeleteTopic();
  const [editOpen, setEditOpen] = useState(false);

  const canEdit = canEditAuthor(topic.author.id);
  const canShowMenu = userIsAdmin || canEdit;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = () => {
    if (!confirm(t("confirm.deleteTopic"))) return;
    deleteTopic.mutate(topic.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-2 py-3 transition-colors hover:bg-accent"
    >
      {isAdmin && (
        <div
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <Link href={paths.topic(topic.id)} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {topic.isPinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
            <span className="truncate text-sm font-medium">
              <HighlightedText html={topic.titleHighlighted} fallback={topic.title} />
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="secondary" className="gap-1">
            <MessageCircle className="h-3 w-3" />
            {topic.postCount}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Eye className="h-3 w-3" />
            {topic.viewCount}
          </Badge>
        </div>
      </Link>
      {canShowMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t("menu.open")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {userIsAdmin && (
              <DropdownMenuItem onClick={() => togglePin.mutate(topic.id)}>
                {topic.isPinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" />
                    {t("menu.unpin")}
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    {t("menu.pin")}
                  </>
                )}
              </DropdownMenuItem>
            )}
            {canEdit && (
              <>
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("menu.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("menu.delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <EditTopicDialog open={editOpen} onOpenChange={setEditOpen} topicId={topic.id} />
    </div>
  );
}

interface TopicListProps {
  categoryId: string;
  isAdmin?: boolean;
  /** 親から渡されたトピック群（指定があれば自前 fetch をスキップする。検索結果分配用）。 */
  topics?: BoardTopic[];
}

export function TopicList({ categoryId, isAdmin = false, topics: presetTopics }: TopicListProps) {
  const t = useTranslations("board");
  const fetchEnabled = presetTopics === undefined;
  const { data, isLoading } = useTopics(
    fetchEnabled ? { categoryId, limit: BOARD_LIMITS.topicsPerPage } : undefined,
    { enabled: fetchEnabled },
  );
  const reorderTopics = useReorderTopics();
  const isPresetMode = !fetchEnabled;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const topics = presetTopics ?? data?.data ?? [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = topics.findIndex((t) => t.id === active.id);
    const newIndex = topics.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(topics, oldIndex, newIndex);
    const items = reordered.map((topic, index) => ({
      id: topic.id,
      sortOrder: index,
    }));
    reorderTopics.mutate({ items });
  };

  if (!isPresetMode && isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t("empty.noTopics")}</p>;
  }

  if (!isAdmin || isPresetMode) {
    return (
      <div className="divide-y">
        {topics.map((topic) => (
          <SortableTopicItem key={topic.id} topic={topic} isAdmin={false} />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y">
          {topics.map((topic) => (
            <SortableTopicItem key={topic.id} topic={topic} isAdmin />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
