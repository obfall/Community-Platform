"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import {
  useMyLibrary,
  useCreateLibraryItem,
  useUpdateLibraryItem,
  useDeleteLibraryItem,
} from "@/hooks/profile/use-library";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import type { LibraryItem } from "@/lib/api/types";

const TYPE_OPTIONS = [
  { value: "book", label: "書籍" },
  { value: "magazine", label: "雑誌" },
  { value: "manga", label: "漫画" },
  { value: "paper", label: "論文" },
  { value: "document", label: "資料" },
  { value: "other", label: "その他" },
] as const;

const STATUS_OPTIONS = [
  { value: "unread", label: "未読" },
  { value: "reading", label: "読書中" },
  { value: "completed", label: "完読" },
  { value: "want", label: "入手したい" },
  { value: "lending", label: "貸出中" },
] as const;

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  unread: "outline",
  reading: "default",
  completed: "secondary",
  want: "outline",
  lending: "destructive",
};

const itemSchema = z.object({
  type: z.enum(["book", "magazine", "manga", "paper", "document", "other"]),
  title: z.string().min(1, "タイトルを入力してください").max(200),
  content: z.string().optional().or(z.literal("")),
  author: z.string().max(200).optional().or(z.literal("")),
  publishedAt: z.string().optional().or(z.literal("")),
  pageCount: z.number().int().min(0).optional(),
  impression: z.string().optional().or(z.literal("")),
  status: z.enum(["unread", "reading", "completed", "want", "lending"]),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export default function ProfileLibraryPage() {
  const { data: items, isLoading } = useMyLibrary();
  const createMutation = useCreateLibraryItem();
  const updateMutation = useUpdateLibraryItem();
  const deleteMutation = useDeleteLibraryItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: "book",
      title: "",
      content: "",
      author: "",
      publishedAt: "",
      pageCount: undefined,
      impression: "",
      status: "unread",
    },
  });

  const openCreate = () => {
    setEditingItem(null);
    form.reset({
      type: "book",
      title: "",
      content: "",
      author: "",
      publishedAt: "",
      pageCount: undefined,
      impression: "",
      status: "unread",
    });
    setDialogOpen(true);
  };

  const openEdit = (item: LibraryItem) => {
    setEditingItem(item);
    form.reset({
      type: item.type,
      title: item.title,
      content: item.content ?? "",
      author: item.author ?? "",
      publishedAt: item.publishedAt ? item.publishedAt.split("T")[0] : "",
      pageCount: item.pageCount ?? undefined,
      impression: item.impression ?? "",
      status: item.status,
    });
    setDialogOpen(true);
  };

  async function onSubmit(values: ItemFormValues) {
    const data = {
      ...values,
      content: values.content || undefined,
      author: values.author || undefined,
      publishedAt: values.publishedAt || undefined,
      pageCount: values.pageCount ?? undefined,
      impression: values.impression || undefined,
    };

    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">マイライブラリー</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          追加
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : !items || items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-4 h-12 w-12" />
          <p>ライブラリーにアイテムはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: LibraryItem) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </Badge>
                    <Badge
                      variant={STATUS_VARIANTS[item.status] ?? "secondary"}
                      className="text-xs"
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{item.title}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {item.author && <p>著者: {item.author}</p>}
                    {item.publishedAt && (
                      <p>出版日: {new Date(item.publishedAt).toLocaleDateString("ja-JP")}</p>
                    )}
                    {item.pageCount != null && <p>{item.pageCount}ページ</p>}
                  </div>
                  {item.impression && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {item.impression}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>削除の確認</AlertDialogTitle>
                        <AlertDialogDescription>
                          「{item.title}」を削除しますか？ この操作は取り消せません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          削除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 追加・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "アイテムを編集" : "ライブラリーに追加"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* タイプ */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>タイプ</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-4"
                      >
                        {TYPE_OPTIONS.map((opt) => (
                          <div key={opt.value} className="flex items-center gap-2">
                            <RadioGroupItem value={opt.value} id={`type-${opt.value}`} />
                            <Label htmlFor={`type-${opt.value}`} className="font-normal">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* タイトル */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>タイトル</FormLabel>
                    <FormControl>
                      <Input placeholder="タイトルを入力" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 内容 */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>内容</FormLabel>
                    <FormControl>
                      <Textarea placeholder="概要・内容メモ" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 著者 */}
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>著者</FormLabel>
                    <FormControl>
                      <Input placeholder="著者名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                {/* 出版日 */}
                <FormField
                  control={form.control}
                  name="publishedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>出版日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ページ数 */}
                <FormField
                  control={form.control}
                  name="pageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ページ数</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 所感 */}
              <FormField
                control={form.control}
                name="impression"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所感</FormLabel>
                    <FormControl>
                      <Textarea placeholder="感想・メモ" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ステータス */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ステータス</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-4"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <div key={opt.value} className="flex items-center gap-2">
                            <RadioGroupItem value={opt.value} id={`status-${opt.value}`} />
                            <Label htmlFor={`status-${opt.value}`} className="font-normal">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "保存中..." : editingItem ? "更新" : "追加"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
