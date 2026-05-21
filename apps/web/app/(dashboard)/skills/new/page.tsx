"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCreateSkill } from "@/hooks/skills/use-skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/select-field";
import { ArrowLeft, Loader2 } from "lucide-react";

const FORMAT_VALUES = ["online", "offline", "both"] as const;

export default function SkillNewPage() {
  const router = useRouter();
  const t = useTranslations("skills");
  const tFormat = useTranslations("skills.format");
  const createSkill = useCreateSkill();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [format, setFormat] = useState("online");

  const formatOptions = FORMAT_VALUES.map((value) => ({ value, label: tFormat(value) }));

  const handleSubmit = () => {
    createSkill.mutate(
      {
        title,
        description: description || undefined,
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        format,
      },
      { onSuccess: () => router.push("/skills") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/skills">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("heading.create")}</h1>
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
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/skills">
              <Button variant="outline">{t("form.cancel")}</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={!title || !price || !durationMinutes || createSkill.isPending}
            >
              {createSkill.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("form.create")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
