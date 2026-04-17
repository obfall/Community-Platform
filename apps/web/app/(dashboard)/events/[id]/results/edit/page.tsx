"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Paperclip, Trash2, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/auth/use-auth";
import { useEvent } from "@/hooks/events/use-events";
import {
  useEventResult,
  useUpsertEventResult,
  useDeleteEventResult,
  useAddResultAttachment,
  useRemoveResultAttachment,
} from "@/hooks/events/use-event-results";
import { filesApi } from "@/lib/api/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { EventExecutionStatus, EventResultPublishStatus } from "@/lib/api/types";

const EXECUTION_OPTIONS: { value: EventExecutionStatus; label: string }[] = [
  { value: "as_planned", label: "予定通り実施" },
  { value: "modified", label: "一部変更あり" },
  { value: "partially_held", label: "一部開催" },
  { value: "postponed", label: "延期" },
  { value: "canceled", label: "中止" },
];

const PUBLISH_OPTIONS: { value: EventResultPublishStatus; label: string }[] = [
  { value: "private", label: "非公開" },
  { value: "public", label: "公開" },
];

const schema = z.object({
  attendanceCount: z.number().int().min(0, "0以上の値を入力してください"),
  summary: z.string().optional(),
  achievementNotes: z.string().optional(),
  improvementNotes: z.string().optional(),
  executionStatus: z.enum(["as_planned", "modified", "partially_held", "postponed", "canceled"]),
  publishStatus: z.enum(["public", "private"]),
});

type FormValues = z.infer<typeof schema>;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EditEventResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: event } = useEvent(id);
  const { data: result, isLoading } = useEventResult(id);
  const upsert = useUpsertEventResult(id);
  const remove = useDeleteEventResult(id);
  const addAttachment = useAddResultAttachment(id);
  const removeAttachment = useRemoveResultAttachment(id);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      attendanceCount: 0,
      summary: "",
      achievementNotes: "",
      improvementNotes: "",
      executionStatus: "as_planned",
      publishStatus: "private",
    },
  });

  useEffect(() => {
    if (result) {
      form.reset({
        attendanceCount: result.attendanceCount,
        summary: result.summary ?? "",
        achievementNotes: result.achievementNotes ?? "",
        improvementNotes: result.improvementNotes ?? "",
        executionStatus: result.executionStatus,
        publishStatus: result.publishStatus,
      });
    }
  }, [result, form]);

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      router.push(`/events/${id}`);
    }
  }, [isLoading, user, isAdmin, router, id]);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!isAdmin) return null;

  const participantCount = event?.participantCount ?? 0;
  const attendanceCount = form.watch("attendanceCount") ?? 0;
  const previewRate =
    participantCount > 0 ? Math.round((attendanceCount / participantCount) * 10000) / 100 : null;

  const submit = (status: "draft" | "completed") => {
    return form.handleSubmit((values) => {
      upsert.mutate(
        { ...values, status },
        {
          onSuccess: () => router.push(`/events/${id}/results`),
        },
      );
    })();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!result) {
      toast.error("先に実施結果を保存してからファイルを添付してください");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const category = file.type.startsWith("image/") ? "image" : "document";
      const uploaded = await filesApi.upload(file, category, true);
      await addAttachment.mutateAsync(uploaded.id);
      toast.success("添付ファイルを追加しました");
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{result ? "実施結果を編集" : "実施結果を作成"}</h1>
          {event && <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>}
        </div>
        {result && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>実施結果を削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  添付ファイルの紐付けも一緒に削除されます。この操作は取り消せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    remove.mutate(undefined, {
                      onSuccess: () => router.push(`/events/${id}`),
                    })
                  }
                >
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Form {...form}>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <Card>
            <CardHeader>
              <CardTitle>統計</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="attendanceCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>参加者数（実際の来場者）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormLabel>出席率（自動計算）</FormLabel>
                <div className="mt-2 flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                  {previewRate != null ? `${previewRate.toFixed(1)}%` : "—"}
                  <span className="ml-auto text-xs text-muted-foreground">
                    申込者数: {participantCount}人
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>実施状況</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="executionStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXECUTION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>自由記述</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>実施結果</FormLabel>
                    <FormControl>
                      <Textarea rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="achievementNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目的達成度</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="improvementNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>改善要望</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>添付ファイル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!result && (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  実施結果を保存すると、ファイルを添付できるようになります
                </p>
              )}
              {result && result.attachments.length > 0 && (
                <div className="space-y-2">
                  {result.attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 truncate">
                        <p className="truncate text-sm font-medium">{a.file.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(a.file.fileSizeBytes)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment.mutate(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {result && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    ファイルを追加
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>公開設定</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="publishStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>公開範囲</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PUBLISH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                「公開」かつ「保存して公開」を選んだ場合のみ、参加者に表示されます。
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(`/events/${id}`)}>
              キャンセル
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => submit("draft")}
              disabled={upsert.isPending}
            >
              下書き保存
            </Button>
            <Button type="button" onClick={() => submit("completed")} disabled={upsert.isPending}>
              保存して公開
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
