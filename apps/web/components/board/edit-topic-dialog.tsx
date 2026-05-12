"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCategories, useTopic, useUpdateTopic } from "@/hooks/board/use-board";
import { BOARD_TEXTAREA_ROWS } from "./constants";

type TopicFormValues = {
  title: string;
  body: string;
  categoryId: string;
  publishStatus: "draft" | "published";
};

interface EditTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
}

export function EditTopicDialog({ open, onOpenChange, topicId }: EditTopicDialogProps) {
  const t = useTranslations("board");
  const { data: categories } = useCategories();
  const { data: topic } = useTopic(open ? topicId : undefined);
  const updateTopic = useUpdateTopic();

  const topicSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t("validation.titleRequired")).max(200),
        body: z.string().min(1, t("validation.bodyRequired")),
        categoryId: z.string().min(1, t("validation.categoryRequired")),
        publishStatus: z.enum(["draft", "published"]),
      }),
    [t],
  );

  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: "", body: "", categoryId: "", publishStatus: "published" },
  });

  useEffect(() => {
    if (open && topic) {
      form.reset({
        title: topic.title,
        body: topic.body,
        categoryId: topic.category.id,
        publishStatus: topic.publishStatus as "draft" | "published",
      });
    }
  }, [open, topic, form]);

  const onSubmit = (data: TopicFormValues) => {
    updateTopic.mutate(
      { id: topicId, data },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t("topic.editTitle")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("topic.categoryLabel")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("topic.categoryPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("topic.titleLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("topic.titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("topic.bodyLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("topic.bodyPlaceholder")}
                      rows={BOARD_TEXTAREA_ROWS.topicBody}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publishStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("topic.publishStatusLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="published">{t("topic.publishStatusPublished")}</SelectItem>
                      <SelectItem value="draft">{t("topic.publishStatusDraft")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("topic.cancel")}
              </Button>
              <Button type="submit" disabled={updateTopic.isPending}>
                {updateTopic.isPending ? t("topic.saving") : t("topic.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
