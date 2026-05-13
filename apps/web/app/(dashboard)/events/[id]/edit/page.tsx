/* eslint-disable react-hooks/incompatible-library */
"use client";

import { use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEvent, useUpdateEvent } from "@/hooks/events/use-events";
import type { EventDetail } from "@/lib/api/types";
import { ImageUpload } from "@/components/image-upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2 } from "lucide-react";
import { StickyFooterBar } from "@/components/sticky-footer-bar";
import { VenuePicker } from "@/components/venue-picker";
import {
  ApplicationFormEditor,
  type ApplicationFormEditorHandle,
} from "../_components/application-form-editor";
import { TagInput } from "@/components/tag-input";
import { EVENT_ORGANIZATION_ROLE_OPTIONS } from "@/lib/events/organization-role";

const schema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(200),
  description: z.string().optional(),
  locationType: z.enum(["venue", "online", "hybrid"]),
  venueId: z.string().optional(),
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
  organizations: z
    .array(
      z.object({
        organizationName: z.string().min(1, "団体名は必須です").max(200),
        role: z.enum(["organizer", "co_organizer", "cooperation", "sponsor", "support"]),
      }),
    )
    .max(20)
    .optional(),
  tags: z.array(z.string().min(1).max(50)).max(3).optional(),
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
  const { data: event, isLoading } = useEvent(id);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!event) {
    return <div className="py-12 text-center text-muted-foreground">イベントが見つかりません</div>;
  }

  return <EditEventForm id={id} event={event} />;
}

function EditEventForm({ id, event }: { id: string; event: EventDetail }) {
  const router = useRouter();
  const updateEvent = useUpdateEvent();
  const formEditorRef = useRef<ApplicationFormEditorHandle>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event.title,
      description: event.description ?? "",
      locationType: event.locationType as "venue" | "online" | "hybrid",
      venueId: event.venueId ?? undefined,
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
      organizations: event.organizations.map((o) => ({
        organizationName: o.organizationName,
        role: o.role,
      })),
      tags: event.tags.map((t) => t.name),
    },
  });

  const orgFields = useFieldArray({ control: form.control, name: "organizations" });

  const locationType = form.watch("locationType");

  const onSubmit = (data: FormValues) => {
    // 申込フォーム設定も同時に保存
    if (formEditorRef.current?.isDirty) {
      formEditorRef.current.save();
    }

    updateEvent.mutate(
      {
        id,
        data: {
          ...data,
          venueId: data.venueId || undefined,
          registrationDeadlineAt: data.registrationDeadlineAt || undefined,
          eventType: data.eventType || undefined,
          accessInfo: data.accessInfo || undefined,
          participationMethod: data.participationMethod || undefined,
          contactInfo: data.contactInfo || undefined,
          cancellationPolicy: data.cancellationPolicy || undefined,
          coverImageUrl: data.coverImageUrl || undefined,
          // 配列を渡せば全件置換、空配列なら全削除（undefined にしない）
          organizations: data.organizations ?? [],
          tags: data.tags ?? [],
        },
      },
      {
        onSuccess: () => router.push(`/events/${id}`),
      },
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">イベント編集</h1>

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
                        name="venueId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>施設</FormLabel>
                            <FormControl>
                              <VenuePicker
                                value={field.value}
                                onChange={(venue) => {
                                  field.onChange(venue?.id);
                                  form.setValue("venueName", venue?.name ?? "");
                                  form.setValue("venueAddress", venue?.address ?? "");
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
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

              {/* 申込フォーム設定 */}
              <ApplicationFormEditor eventId={id} handleRef={formEditorRef} />
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

              <Card>
                <CardHeader>
                  <CardTitle>タグ</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <TagInput
                            value={field.value ?? []}
                            onChange={field.onChange}
                            maxTags={3}
                          />
                        </FormControl>
                        <p className="mt-1 text-xs text-muted-foreground">
                          最大 3 つ。検索に使われます
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>関係団体</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orgFields.fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      共催・協力団体などを登録できます
                    </p>
                  ) : (
                    orgFields.fields.map((field, index) => (
                      <div key={field.id} className="space-y-2 rounded-md border p-3">
                        <FormField
                          control={form.control}
                          name={`organizations.${index}.organizationName`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">団体名</FormLabel>
                              <FormControl>
                                <Input {...f} placeholder="例: 株式会社○○" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`organizations.${index}.role`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">役割</FormLabel>
                              <Select onValueChange={f.onChange} value={f.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="役割を選択" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {EVENT_ORGANIZATION_ROLE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => orgFields.remove(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          削除
                        </Button>
                      </div>
                    ))
                  )}
                  {orgFields.fields.length < 20 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        orgFields.append({ organizationName: "", role: "co_organizer" })
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      関係団体を追加
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <StickyFooterBar
            onCancel={() => router.push(`/events/${id}`)}
            disabled={updateEvent.isPending}
          />
        </form>
      </Form>
    </div>
  );
}
