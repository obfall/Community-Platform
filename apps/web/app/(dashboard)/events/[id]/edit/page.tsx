/* eslint-disable react-hooks/incompatible-library */
"use client";

import { use, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useEvent, useUpdateEvent } from "@/hooks/events/use-events";
import type { EventDetail } from "@/lib/api/types";
import { ImageUpload } from "@/components/image-upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { Building2, Mic, Plus, Trash2 } from "lucide-react";
import { StickyFooterBar } from "@/components/sticky-footer-bar";
import { VenuePicker } from "@/components/venue-picker";
import {
  ApplicationFormEditor,
  type ApplicationFormEditorHandle,
} from "../_components/application-form-editor";
import { TagInput } from "@/components/tag-input";
import { MemberPicker } from "@/components/member-picker";
import { EVENT_ORGANIZATION_ROLE_VALUES_ORDERED } from "@/lib/events/organization-role";
import { EVENT_SPEAKER_ROLE_VALUES_ORDERED } from "@/lib/events/speaker-role";
import {
  MAX_EVENT_ORGANIZATIONS,
  MAX_EVENT_SPEAKERS,
  MAX_EVENT_TAG_LENGTH,
  MAX_EVENT_TAGS,
  MAX_EVENT_TITLE_LENGTH,
  MAX_ORGANIZATION_NAME_LENGTH,
  MAX_SPEAKER_NAME_LENGTH,
  MAX_SPEAKER_TITLE_LENGTH,
  EVENT_ORGANIZATION_ROLE_VALUES,
  EVENT_SPEAKER_ROLE_VALUES,
  EVENT_STATUS_VALUES,
  EVENT_LOCATION_TYPE_VALUES,
  EVENT_PLANNING_ROLE_VALUES,
  EVENT_TYPE_VALUES,
  EventOrganizationRole,
  EventSpeakerRole,
  EventLocationType,
  EventPlanningRole,
} from "@community-platform/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { EVENT_STATUS_OPTION_VALUES } from "@/lib/events/event-status";

function buildSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t("titleRequired")).max(MAX_EVENT_TITLE_LENGTH),
    description: z.string().optional(),
    locationType: z.enum(EVENT_LOCATION_TYPE_VALUES),
    venueId: z.string().optional(),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    onlineUrl: z.string().optional(),
    startAt: z.string().min(1, t("startAtRequired")),
    endAt: z.string().min(1, t("endAtRequired")),
    registrationDeadlineAt: z.string().optional(),
    eventTypes: z.array(z.enum(EVENT_TYPE_VALUES)).optional(),
    planningRole: z.enum(EVENT_PLANNING_ROLE_VALUES).optional(),
    accessInfo: z.string().optional(),
    participationMethod: z.string().optional(),
    contactInfo: z.string().optional(),
    cancellationPolicy: z.string().optional(),
    coverImageUrl: z.string().nullable().optional(),
    status: z.enum(EVENT_STATUS_VALUES),
    isCalendarVisible: z.boolean().optional(),
    organizations: z
      .array(
        z.object({
          organizationName: z
            .string()
            .min(1, t("organizationNameRequired"))
            .max(MAX_ORGANIZATION_NAME_LENGTH),
          role: z.enum(EVENT_ORGANIZATION_ROLE_VALUES),
        }),
      )
      .max(MAX_EVENT_ORGANIZATIONS)
      .optional(),
    tags: z.array(z.string().min(1).max(MAX_EVENT_TAG_LENGTH)).max(MAX_EVENT_TAGS).optional(),
    speakers: z
      .array(
        z.object({
          name: z.string().min(1, t("speakerNameRequired")).max(MAX_SPEAKER_NAME_LENGTH),
          title: z.string().max(MAX_SPEAKER_TITLE_LENGTH).optional(),
          role: z.enum(EVENT_SPEAKER_ROLE_VALUES),
          userId: z.string().uuid().optional(),
        }),
      )
      .max(MAX_EVENT_SPEAKERS)
      .optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tDetail = useTranslations("events.detail");
  const { data: event, isLoading } = useEvent(id);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{tDetail("loading")}</div>;
  }

  if (!event) {
    return <div className="py-12 text-center text-muted-foreground">{tDetail("notFound")}</div>;
  }

  return <EditEventForm id={id} event={event} />;
}

function EditEventForm({ id, event }: { id: string; event: EventDetail }) {
  const router = useRouter();
  const updateEvent = useUpdateEvent();
  const formEditorRef = useRef<ApplicationFormEditorHandle>(null);
  const t = useTranslations("events.edit");
  const tLabel = useTranslations("events.form.label");
  const tPh = useTranslations("events.form.placeholder");
  const tHint = useTranslations("events.form.hint");
  const tCard = useTranslations("events.form.card");
  const tBtn = useTranslations("events.form.button");
  const tValidation = useTranslations("events.form.validation");
  const tLocation = useTranslations("enums.eventLocationType");
  const tStatus = useTranslations("enums.eventStatus");
  const tOrgRole = useTranslations("enums.eventOrganizationRole");
  const tSpeakerRole = useTranslations("enums.eventSpeakerRole");

  const schema = useMemo(() => buildSchema((k) => tValidation(k)), [tValidation]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event.title,
      description: event.description ?? "",
      locationType: event.locationType as EventLocationType,
      venueId: event.venueId ?? undefined,
      venueName: event.venueName ?? "",
      venueAddress: event.venueAddress ?? "",
      onlineUrl: event.onlineUrl ?? "",
      startAt: toLocalDatetime(event.startAt),
      endAt: toLocalDatetime(event.endAt),
      registrationDeadlineAt: toLocalDatetime(event.registrationDeadlineAt),
      eventTypes: (event.eventTypes ?? []).filter((v): v is (typeof EVENT_TYPE_VALUES)[number] =>
        EVENT_TYPE_VALUES.includes(v as (typeof EVENT_TYPE_VALUES)[number]),
      ),
      planningRole: EVENT_PLANNING_ROLE_VALUES.includes(
        event.planningRole as (typeof EVENT_PLANNING_ROLE_VALUES)[number],
      )
        ? (event.planningRole as (typeof EVENT_PLANNING_ROLE_VALUES)[number])
        : EventPlanningRole.ORGANIZER,
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
      tags: event.tags.map((tag) => tag.name),
      speakers: event.speakers.map((s) => ({
        name: s.name,
        title: s.title ?? undefined,
        role: s.role,
        userId: s.user?.id ?? undefined,
      })),
    },
  });

  const orgFields = useFieldArray({ control: form.control, name: "organizations" });
  const speakerFields = useFieldArray({ control: form.control, name: "speakers" });

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
          eventTypes: data.eventTypes ?? [],
          accessInfo: data.accessInfo || undefined,
          participationMethod: data.participationMethod || undefined,
          contactInfo: data.contactInfo || undefined,
          cancellationPolicy: data.cancellationPolicy || undefined,
          // 画像削除（null）を API に伝える必要があるので || undefined しない
          coverImageUrl: data.coverImageUrl,
          // 配列を渡せば全件置換、空配列なら全削除（undefined にしない）
          organizations: data.organizations ?? [],
          tags: data.tags ?? [],
          speakers: data.speakers ?? [],
        },
      },
      {
        onSuccess: () => router.push(`/events/${id}`),
      },
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* メイン */}
            <div className="space-y-6 lg:col-span-2">
              {/* 基本情報 */}
              <Card>
                <CardHeader>
                  <CardTitle>{tCard("basicInfo")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tLabel("title")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>{tLabel("coverImage")}</FormLabel>
                        <FormControl>
                          <ImageUpload value={field.value} onChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tLabel("description")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={6} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tLabel("startAt")}</FormLabel>
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
                          <FormLabel>{tLabel("endAt")}</FormLabel>
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
                        <FormLabel>{tLabel("registrationDeadlineAt")}</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="planningRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tLabel("planningRole")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EVENT_PLANNING_ROLE_VALUES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* 登壇者 */}
                  <Separator />
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {tCard("speakers")}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {speakerFields.fields.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{tHint("speakers")}</p>
                      ) : (
                        speakerFields.fields.map((field, index) => (
                          <div key={field.id} className="space-y-2 rounded-md border p-3">
                            <FormField
                              control={form.control}
                              name={`speakers.${index}.userId`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">{tLabel("memberLink")}</FormLabel>
                                  <FormControl>
                                    <MemberPicker
                                      value={
                                        f.value
                                          ? {
                                              id: f.value,
                                              name: form.getValues(`speakers.${index}.name`) || "",
                                              avatarUrl: null,
                                            }
                                          : null
                                      }
                                      onChange={(m) => {
                                        f.onChange(m?.id ?? undefined);
                                        if (m) {
                                          form.setValue(`speakers.${index}.name`, m.name);
                                          if (m.defaultTitle) {
                                            form.setValue(
                                              `speakers.${index}.title`,
                                              m.defaultTitle,
                                            );
                                          }
                                        }
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`speakers.${index}.name`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">{tLabel("speakerName")}</FormLabel>
                                  <FormControl>
                                    <Input {...f} placeholder={tPh("speakerName")} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`speakers.${index}.title`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    {tLabel("speakerTitle")}
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...f} placeholder={tPh("speakerTitle")} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`speakers.${index}.role`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">{tLabel("role")}</FormLabel>
                                  <Select onValueChange={f.onChange} value={f.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={tPh("selectRole")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {EVENT_SPEAKER_ROLE_VALUES_ORDERED.map((v) => (
                                        <SelectItem key={v} value={v}>
                                          {tSpeakerRole(v)}
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
                              onClick={() => speakerFields.remove(index)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              {tBtn("remove")}
                            </Button>
                          </div>
                        ))
                      )}
                      {speakerFields.fields.length < MAX_EVENT_SPEAKERS && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            speakerFields.append({
                              name: "",
                              title: "",
                              role: EventSpeakerRole.SPEAKER,
                            })
                          }
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {tBtn("addSpeaker")}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 関係団体 */}
                  <Separator />
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {tCard("organizations")}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {orgFields.fields.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{tHint("organizations")}</p>
                      ) : (
                        orgFields.fields.map((field, index) => (
                          <div key={field.id} className="space-y-2 rounded-md border p-3">
                            <FormField
                              control={form.control}
                              name={`organizations.${index}.organizationName`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    {tLabel("organizationName")}
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...f} placeholder={tPh("organizationName")} />
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
                                  <FormLabel className="text-xs">{tLabel("role")}</FormLabel>
                                  <Select onValueChange={f.onChange} value={f.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={tPh("selectRole")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {EVENT_ORGANIZATION_ROLE_VALUES_ORDERED.map((v) => (
                                        <SelectItem key={v} value={v}>
                                          {tOrgRole(v)}
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
                              {tBtn("remove")}
                            </Button>
                          </div>
                        ))
                      )}
                      {orgFields.fields.length < MAX_EVENT_ORGANIZATIONS && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            orgFields.append({
                              organizationName: "",
                              role: EventOrganizationRole.CO_ORGANIZER,
                            })
                          }
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {tBtn("addOrganization")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 詳細情報 */}
              <Card>
                <CardHeader>
                  <CardTitle>{tCard("detailInfo")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="eventTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tLabel("eventType")}</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {EVENT_TYPE_VALUES.map((v) => {
                              const checked = field.value?.includes(v) ?? false;
                              return (
                                <label
                                  key={v}
                                  className="flex items-center gap-2 text-sm font-normal"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(c) => {
                                      const next = new Set(field.value ?? []);
                                      if (c) next.add(v);
                                      else next.delete(v);
                                      field.onChange(Array.from(next));
                                    }}
                                  />
                                  <span>{v}</span>
                                </label>
                              );
                            })}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tLabel("locationType")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EVENT_LOCATION_TYPE_VALUES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {tLocation(v)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  {(locationType === EventLocationType.VENUE ||
                    locationType === EventLocationType.HYBRID) && (
                    <>
                      <FormField
                        control={form.control}
                        name="venueId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tLabel("venue")}</FormLabel>
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
                            <FormLabel>{tLabel("venueName")}</FormLabel>
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
                            <FormLabel>{tLabel("venueAddress")}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  {(locationType === EventLocationType.ONLINE ||
                    locationType === EventLocationType.HYBRID) && (
                    <FormField
                      control={form.control}
                      name="onlineUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tLabel("onlineUrl")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="accessInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tLabel("accessInfo")}</FormLabel>
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
                        <FormLabel>{tLabel("participationMethod")}</FormLabel>
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
                        <FormLabel>{tLabel("contactInfo")}</FormLabel>
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
                        <FormLabel>{tLabel("cancellationPolicy")}</FormLabel>
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
                  <CardTitle>{tCard("settings")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tLabel("status")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EVENT_STATUS_OPTION_VALUES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {tStatus(v)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{tCard("tags")}</CardTitle>
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
                            maxTags={MAX_EVENT_TAGS}
                          />
                        </FormControl>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tHint("tags", { max: MAX_EVENT_TAGS })}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
