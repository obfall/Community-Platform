"use client";

import { use, useState } from "react";
import {
  useProjectBoardCategories,
  useCreateBoardCategory,
  useCreateBoardTopic,
} from "@/hooks/projects/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { TopicList } from "./_components/topic-list";
import { TopicDetail } from "./_components/topic-detail";

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: categories } = useProjectBoardCategories(projectId);
  const createCategory = useCreateBoardCategory();
  const createTopic = useCreateBoardTopic();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [topicCategoryId, setTopicCategoryId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicBody, setTopicBody] = useState("");

  type CategoryItem = { id: string; name: string; description: string | null; topicCount: number };
  const cats = (categories as CategoryItem[] | undefined) ?? [];

  if (selectedTopicId) {
    return <TopicDetail topicId={selectedTopicId} onBack={() => setSelectedTopicId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">掲示板</h2>
        <Button size="sm" variant="outline" onClick={() => setCatDialogOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          カテゴリ追加
        </Button>
      </div>

      {cats.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          カテゴリがありません。まずカテゴリを作成してください。
        </p>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {cats.map((cat) => (
            <AccordionItem key={cat.id} value={cat.id} className="rounded-lg border">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {cat.topicCount}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <TopicList
                  projectId={projectId}
                  categoryId={cat.id}
                  onSelect={setSelectedTopicId}
                  onNew={() => {
                    setTopicCategoryId(cat.id);
                    setTopicDialogOpen(true);
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリ作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>カテゴリ名</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="カテゴリ名"
              />
            </div>
            <Button
              onClick={() => {
                createCategory.mutate(
                  { projectId, data: { name: catName } },
                  {
                    onSuccess: () => {
                      setCatDialogOpen(false);
                      setCatName("");
                    },
                  },
                );
              }}
              disabled={!catName || createCategory.isPending}
              className="w-full"
            >
              作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規トピック</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>タイトル</Label>
              <Input
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="トピックのタイトル"
              />
            </div>
            <div>
              <Label>本文</Label>
              <Textarea
                value={topicBody}
                onChange={(e) => setTopicBody(e.target.value)}
                rows={6}
                placeholder="トピックの内容"
              />
            </div>
            <Button
              onClick={() => {
                createTopic.mutate(
                  {
                    projectId,
                    data: {
                      title: topicTitle,
                      body: topicBody,
                      categoryId: topicCategoryId ?? undefined,
                    },
                  },
                  {
                    onSuccess: () => {
                      setTopicDialogOpen(false);
                      setTopicTitle("");
                      setTopicBody("");
                    },
                  },
                );
              }}
              disabled={!topicTitle || !topicBody || createTopic.isPending}
              className="w-full"
            >
              作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
