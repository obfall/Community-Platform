/* eslint-disable react-hooks/incompatible-library */
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateEvent } from "@/hooks/use-events";
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
import { ArrowLeft } from "lucide-react";
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
});

type FormValues = z.infer<typeof schema>;

export default function NewEventPage() {
  const router = useRouter();
  const createEvent = useCreateEvent();

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
    },
  });

  const locationType = form.watch("locationType");

  const onSubmit = (data: FormValues) => {
    createEvent.mutate(
      {
        ...data,
        registrationDeadlineAt: data.registrationDeadlineAt || undefined,
        eventType: data.eventType || undefined,
        accessInfo: data.accessInfo || undefined,
        participationMethod: data.participationMethod || undefined,
        contactInfo: data.contactInfo || undefined,
        cancellationPolicy: data.cancellationPolicy || undefined,
        coverImageUrl: data.coverImageUrl || undefined,
      },
      {
        onSuccess: (event) => router.push(`/events/${event.id}`),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">イベント作成</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* メイン */}
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
                          <Input {...field} placeholder="イベントタイトル" />
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
                          <Textarea {...field} placeholder="イベントの説明" rows={6} />
                        </FormControl>
                        <FormMessage />
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
                        <FormMessage />
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
                              <Input {...field} placeholder="会場名" />
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
                              <Input {...field} placeholder="住所" />
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
                            <Input {...field} placeholder="https://..." />
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

              <Button type="submit" className="w-full" disabled={createEvent.isPending}>
                イベントを作成
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
