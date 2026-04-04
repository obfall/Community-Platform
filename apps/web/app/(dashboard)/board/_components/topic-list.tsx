"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { GripVertical, MessageCircle, Eye, Pin } from "lucide-react";
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
import { useTopics, useReorderTopics } from "@/hooks/use-board";
import { Badge } from "@/components/ui/badge";
import type { BoardTopic } from "@/lib/api/types";

function SortableTopicItem({ topic, isAdmin }: { topic: BoardTopic; isAdmin: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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
      <Link href={`/board/topics/${topic.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {topic.isPinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
            <span className="truncate text-sm font-medium">{topic.title}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{topic.author.name}</span>
            <span>
              {formatDistanceToNow(new Date(topic.createdAt), {
                addSuffix: true,
                locale: ja,
              })}
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
    </div>
  );
}

interface TopicListProps {
  categoryId: string;
  isAdmin?: boolean;
}

export function TopicList({ categoryId, isAdmin = false }: TopicListProps) {
  const { data, isLoading } = useTopics({ categoryId, limit: 20 });
  const reorderTopics = useReorderTopics();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const topics = data?.data ?? [];

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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">トピックはまだありません</p>
    );
  }

  if (!isAdmin) {
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
