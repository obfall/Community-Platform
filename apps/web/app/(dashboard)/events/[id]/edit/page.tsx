"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/use-events";
import { ImageUpload } from "@/components/image-upload";
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
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(200),
  description: z.string().optional(),
  locationType: z.enum(["venue", "online", "hybrid"]),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  onlineUrl: z.string().optional(),
  startAt: z.string().min(1, "開始日時は必須です"),
  endAt: z.string().min(1, "終了日時は必須です"),
  registrationDeadlineAt: z.string().optional(),
  eventType: z.string().optional(),
  planningRole: z.string().optional(),
  accessInfo: z.string().optional(),
  participationMethod: z.string().optional(),
  contactInfo: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  coverImageUrl: z.string().nullable().optional(),
  status: z.enum(["draft", "recruiting", "closed", "canceled", "ended"]),
  isCalendarVisible: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      locationType: "venue",
      venueName: "",
      venueAddress: "",
      onlineUrl: "",
      startAt: "",
      endAt: "",
      registrationDeadlineAt: "",
      eventType: "",
      planningRole: "主催",
      accessInfo: "",
      participationMethod: "",
      contactInfo: "",
      cancellationPolicy: "",
      coverImageUrl: null,
      status: "draft",
      isCalendarVisible: true,
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description ?? "",
        locationType: event.locationType as "venue" | "online" | "hybrid",
        venueName: event.venueName ?? "",
        venueAddress: event.venueAddress ?? "",
        onlineUrl: event.onlineUrl ?? "",
        startAt: toLocalDatetime(event.startAt),
        endAt: toLocalDatetime(event.endAt),
        registrationDeadlineAt: toLocalDatetime(event.registrationDeadlineAt),
        eventType: event.eventType ?? "",
        planningRole: event.planningRole ?? "主催",
        accessInfo: event.accessInfo ?? "",
        participationMethod: event.participationMethod ?? "",
        contactInfo: event.contactInfo ?? "",
        cancellationPolicy: event.cancellationPolicy ?? "",
        coverImageUrl: event.coverImageUrl ?? null,
        status: event.status as FormValues["status"],
        isCalendarVisible: event.isCalendarVisible,
      });
    }
  }, [event, form]);

  const locationType = form.watch("locationType");

  const onSubmit = (data: FormValues) => {
    updateEvent.mutate(
      {
        id,
        data: {
          ...data,
          registrationDeadlineAt: data.registrationDeadlineAt || undefined,
          eventType: data.eventType || undefined,
          accessInfo: data.accessInfo || undefined,
          participationMethod: data.participationMethod || undefined,
          contactInfo: data.contactInfo || undefined,
          cancellationPolicy: data.cancellationPolicy || undefined,
          coverImageUrl: data.coverImageUrl || undefined,
        },
      },
      {
        onSuccess: () => router.push(`/events/${id}`),
      },
    );
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!event) {
    return <div className="py-12 text-center text-muted-foreground">イベントが見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/events/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">イベント編集</h1>
        <div className="ml-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-4 w-4" />
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>イベントを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  「{event.title}」を削除します。この操作は論理削除です。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteEvent.mutate(id, { onSuccess: () => router.push("/events") });
                  }}
                >
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>タイトル</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>概要</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={6} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coverImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>カバー画像</FormLabel>
                        <FormControl>
                          <ImageUpload value={field.value} onChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>開催情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>開催形態</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="venue">会場</SelectItem>
                            <SelectItem value="online">オンライン</SelectItem>
                            <SelectItem value="hybrid">ハイブリッド</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  {(locationType === "venue" || locationType === "hybrid") && (
                    <>
                      <FormField
                        control={form.control}
                        name="venueName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>会場名</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="venueAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>住所</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  {(locationType === "online" || locationType === "hybrid") && (
                    <FormField
                      control={form.control}
                      name="onlineUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>オンラインURL</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>開始日時</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>終了日時</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="registrationDeadlineAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>申込締切（オプション）</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>追加情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="accessInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>アクセス情報</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="participationMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>参加方法</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>問合せ先</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cancellationPolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>キャンセルポリシー</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* サイドバー */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ステータス</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">下書き</SelectItem>
                            <SelectItem value="recruiting">募集中</SelectItem>
                            <SelectItem value="closed">締切</SelectItem>
                            <SelectItem value="canceled">中止</SelectItem>
                            <SelectItem value="ended">終了</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>イベント種別</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="例: セミナー" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="planningRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>企画役割</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={updateEvent.isPending}>
                更新する
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
