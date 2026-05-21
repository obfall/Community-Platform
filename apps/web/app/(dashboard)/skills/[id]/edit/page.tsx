"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSkill, useUpdateSkill } from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/select-field";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { SkillListItem } from "@/lib/api/types";

const FORMAT_VALUES = ["online", "offline", "both"] as const;
const STATUS_VALUES = ["active", "inactive", "draft"] as const;

export default function SkillEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("skills");
  const { canEditAuthor } = useAuth();
  const { data: skill, isLoading } = useSkill(id);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{t("detail.loading")}</div>;
  }
  if (!skill) {
    return <div className="py-12 text-center text-muted-foreground">{t("detail.notFound")}</div>;
  }
  if (!canEditAuthor(skill.provider.id)) {
    return <div className="py-12 text-center text-muted-foreground">{t("edit.noPermission")}</div>;
  }
  return <Form id={id} initial={skill} />;
}

function Form({ id, initial }: { id: string; initial: SkillListItem }) {
  const router = useRouter();
  const t = useTranslations("skills");
  const tFormat = useTranslations("skills.format");
  const tStatus = useTranslations("skills.status");
  const updateSkill = useUpdateSkill();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(String(initial.price));
  const [durationMinutes, setDurationMinutes] = useState(String(initial.durationMinutes));
  const [format, setFormat] = useState(initial.format);
  const [status, setStatus] = useState(initial.status);

  const formatOptions = FORMAT_VALUES.map((value) => ({ value, label: tFormat(value) }));
  const statusOptions = STATUS_VALUES.map((value) => ({ value, label: tStatus(value) }));

  const handleSubmit = () => {
    updateSkill.mutate(
      {
        id,
        data: {
          title,
          description: description || undefined,
          price: Number(price),
          durationMinutes: Number(durationMinutes),
          format,
          status,
        },
      },
      { onSuccess: () => router.push(`/skills/${id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/skills/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("heading.edit")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("heading.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("form.titleLabel")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("form.titlePlaceholder")}
              maxLength={200}
            />
          </div>
          <div>
            <Label>{t("form.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{t("form.priceLabel")}</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t("form.pricePlaceholder")}
                min="0"
              />
            </div>
            <div>
              <Label>{t("form.durationLabel")}</Label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder={t("form.durationPlaceholder")}
                min="1"
              />
            </div>
            <div>
              <Label>{t("form.formatLabel")}</Label>
              <SelectField value={format} onChange={setFormat} options={formatOptions} />
            </div>
          </div>
          <div>
            <Label>{t("form.statusLabel")}</Label>
            <SelectField value={status} onChange={setStatus} options={statusOptions} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href={`/skills/${id}`}>
              <Button variant="outline">{t("form.cancel")}</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={!title || !price || !durationMinutes || updateSkill.isPending}
            >
              {updateSkill.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("form.update")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
