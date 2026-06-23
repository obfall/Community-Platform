"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useTranslations } from "next-intl";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FileUploadList, type UploadedFileItem } from "@/components/file-upload-list";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Paperclip,
  FileIcon,
  X,
} from "lucide-react";
import type { LibraryItem } from "@/lib/api/types";

const TYPE_VALUES = ["book", "magazine", "manga", "paper", "document", "other"] as const;

const STATUS_VALUES = ["unread", "reading", "completed", "want", "lending"] as const;

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  unread: "outline",
  reading: "default",
  completed: "secondary",
  want: "outline",
  lending: "destructive",
};

// バリデーションメッセージを i18n キーで解決するため、t を受け取るファクトリにする。
const createItemSchema = (t: (key: string) => string) =>
  z.object({
    type: z.enum(["book", "magazine", "manga", "paper", "document", "other"]),
    title: z.string().min(1, t("library.validation.titleRequired")).max(200),
    content: z.string().optional().or(z.literal("")),
    author: z.string().max(200).optional().or(z.literal("")),
    publishedAt: z.string().optional().or(z.literal("")),
    pageCount: z.number().int().min(0).optional(),
    impression: z.string().optional().or(z.literal("")),
    status: z.enum(["unread", "reading", "completed", "want", "lending"]),
  });

type ItemFormValues = z.infer<ReturnType<typeof createItemSchema>>;

export default function ProfileLibraryPage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const itemSchema = createItemSchema(t);
  const { data: items, isLoading } = useMyLibrary();
  const createMutation = useCreateLibraryItem();
  const updateMutation = useUpdateLibraryItem();
  const deleteMutation = useDeleteLibraryItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryItem | null>(null);
  // 添付ファイルは DB 上 fileId 1 件のみ。フォーム外の state で単一ファイルを管理する。
  const [attachedFile, setAttachedFile] = useState<UploadedFileItem | null>(null);

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
    setAttachedFile(null);
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
    setAttachedFile(
      item.file
        ? {
            fileId: item.file.id,
            url: item.file.publicUrl,
            name: item.file.originalName,
            contentType: "",
          }
        : null,
    );
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
      // null を送ると添付を解除（更新時）。未添付の新規作成時も null で問題ない。
      fileId: attachedFile?.fileId ?? null,
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
        <h2 className="text-xl font-bold">{t("library.title")}</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("library.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>
      ) : !items || items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-4 h-12 w-12" />
          <p>{t("library.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: LibraryItem) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {t.has(`library.typeLabels.${item.type}`)
                        ? t(`library.typeLabels.${item.type}`)
                        : item.type}
                    </Badge>
                    <Badge
                      variant={STATUS_VARIANTS[item.status] ?? "secondary"}
                      className="text-xs"
                    >
                      {t.has(`library.statusLabels.${item.status}`)
                        ? t(`library.statusLabels.${item.status}`)
                        : item.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{item.title}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {item.author && <p>{t("library.authorPrefix", { author: item.author })}</p>}
                    {item.publishedAt && (
                      <p>
                        {t("library.publishedAtPrefix", {
                          date: new Date(item.publishedAt).toLocaleDateString("ja-JP"),
                        })}
                      </p>
                    )}
                    {item.pageCount != null && (
                      <p>{t("library.pageCount", { count: item.pageCount })}</p>
                    )}
                  </div>
                  {item.file && (
                    <a
                      href={item.file.publicUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary mt-2 inline-flex items-center gap-1 text-xs hover:underline"
                    >
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.file.originalName}</span>
                    </a>
                  )}
                  {item.impression && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {item.impression}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(item)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        {t("library.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        {t("library.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 削除確認 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("library.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("library.deleteConfirm.description", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("library.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 追加・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t("library.dialog.editTitle") : t("library.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* タイプ */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("library.fields.type")}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-4"
                      >
                        {TYPE_VALUES.map((value) => (
                          <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem value={value} id={`type-${value}`} />
                            <Label htmlFor={`type-${value}`} className="font-normal">
                              {t(`library.typeLabels.${value}`)}
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
                    <FormLabel>{t("library.fields.title")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("library.placeholders.title")} {...field} />
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
                    <FormLabel>{t("library.fields.content")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("library.placeholders.content")}
                        rows={3}
                        {...field}
                      />
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
                    <FormLabel>{t("library.fields.author")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("library.placeholders.author")} {...field} />
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
                      <FormLabel>{t("library.fields.publishedAt")}</FormLabel>
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
                      <FormLabel>{t("library.fields.pageCount")}</FormLabel>
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
                    <FormLabel>{t("library.fields.impression")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("library.placeholders.impression")}
                        rows={3}
                        {...field}
                      />
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
                    <FormLabel>{t("library.fields.status")}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-4"
                      >
                        {STATUS_VALUES.map((value) => (
                          <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem value={value} id={`status-${value}`} />
                            <Label htmlFor={`status-${value}`} className="font-normal">
                              {t(`library.statusLabels.${value}`)}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 添付ファイル（DB 上は単一。1 件添付済みのときは追加 UI を隠す） */}
              <div className="space-y-2">
                <Label>{t("library.fields.attachment")}</Label>
                {attachedFile ? (
                  <div className="flex items-center gap-3 rounded-md border p-2 text-sm">
                    {attachedFile.contentType.startsWith("image/") && attachedFile.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachedFile.url}
                        alt={attachedFile.name}
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                        <FileIcon className="text-muted-foreground h-5 w-5" />
                      </div>
                    )}
                    {attachedFile.url ? (
                      <a
                        href={attachedFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate hover:underline"
                      >
                        {attachedFile.name}
                      </a>
                    ) : (
                      <span className="flex-1 truncate">{attachedFile.name}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="text-muted-foreground hover:text-destructive rounded p-1 hover:bg-muted"
                      aria-label={t("library.delete")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <FileUploadList
                    value={[]}
                    onChange={(files) => files[0] && setAttachedFile(files[0])}
                    fileCategory="document"
                  />
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending
                  ? t("library.saving")
                  : editingItem
                    ? t("library.update")
                    : t("library.add")}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
