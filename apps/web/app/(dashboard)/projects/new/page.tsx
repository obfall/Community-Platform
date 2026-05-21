"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCreateProject } from "@/hooks/projects/use-projects";
import { useEvents } from "@/hooks/events/use-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField, NONE_VALUE } from "@/components/select-field";
import { ImageUpload } from "@/components/image-upload";
import { TagInput } from "@/components/tag-input";
import { MAX_PROJECT_TAGS, MAX_PROJECT_TAG_LENGTH } from "@community-platform/shared";
import { PROJECT_STATUS_VALUES } from "@/lib/projects/project-status";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const t = useTranslations("projects");
  const tStatus = useTranslations("enums.projectStatus");
  const createProject = useCreateProject();
  const { data: eventsData } = useEvents({ limit: 100, page: 1 });
  const events = eventsData?.data ?? [];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("not_started");
  const [eventId, setEventId] = useState(NONE_VALUE);
  const [tags, setTags] = useState<string[]>([]);

  const statusOptions = PROJECT_STATUS_VALUES.map((value) => ({ value, label: tStatus(value) }));

  const handleSubmit = () => {
    createProject.mutate(
      {
        name,
        description: description || undefined,
        coverImageUrl: coverImageUrl || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
        eventId: eventId === NONE_VALUE ? undefined : eventId,
        tags: tags.length > 0 ? tags : undefined,
      },
      { onSuccess: (project) => router.push(`/projects/${project.id}`) },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("heading.createTitle")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("heading.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("form.nameLabel")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
            />
          </div>
          <div>
            <Label>{t("form.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder={t("form.descriptionPlaceholder")}
            />
          </div>
          <div>
            <Label>{t("form.coverImageLabel")}</Label>
            <ImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
          </div>
          <div>
            <Label>{t("form.statusLabel")}</Label>
            <SelectField value={status} onChange={setStatus} options={statusOptions} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("form.startDateLabel")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{t("form.endDateLabel")}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t("form.relatedEventLabel")}</Label>
            <SelectField
              value={eventId}
              onChange={setEventId}
              options={events.map((e) => ({ value: e.id, label: e.title }))}
              includeNone
              placeholder={t("form.relatedEventPlaceholder")}
            />
          </div>
          <div>
            <Label>{t("form.tagsLabel", { max: MAX_PROJECT_TAGS })}</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              maxTags={MAX_PROJECT_TAGS}
              maxLength={MAX_PROJECT_TAG_LENGTH}
              placeholder={t("form.tagsPlaceholder")}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!name || createProject.isPending}
            className="w-full"
          >
            {t("form.createSubmit")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
