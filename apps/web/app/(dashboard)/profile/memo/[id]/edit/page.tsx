"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemoDetail, useUpdateMemo, useMemoCategories } from "@/hooks/memo/use-memo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { FileUploadList, type UploadedFileItem } from "@/components/file-upload-list";
import type { MemoDetail } from "@/lib/api/types";

export default function MemoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { data, isLoading } = useMemoDetail(id);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>;
  }
  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">{t("memo.detail.notFound")}</div>
    );
  }
  return <Form id={id} initial={data} />;
}

function Form({ id, initial }: { id: string; initial: MemoDetail }) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const updateMemo = useUpdateMemo();
  const { data: categories } = useMemoCategories();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.body ?? "");
  const [categoryId, setCategoryId] = useState<string | undefined>(initial.category?.id);
  const [files, setFiles] = useState<UploadedFileItem[]>(
    initial.attachments.map((a) => ({
      fileId: a.fileId,
      url: a.file.publicUrl,
      name: a.file.originalName,
      contentType: a.file.contentType,
    })),
  );

  const handleSubmit = () => {
    updateMemo.mutate(
      {
        id,
        data: {
          title,
          description,
          categoryId: categoryId ?? undefined,
          attachmentFileIds: files.map((f) => f.fileId),
        },
      },
      { onSuccess: () => router.push(`/profile/memo/${id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/profile/memo/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("memo.edit.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("memo.form.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("memo.form.titleLabel")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>{t("memo.form.body")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
            />
          </div>
          <div>
            <Label>{t("memo.form.category")}</Label>
            <Select
              value={categoryId ?? "none"}
              onValueChange={(v) => setCategoryId(v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("memo.form.uncategorized")}</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("memo.form.attachments")}</Label>
            <FileUploadList value={files} onChange={setFiles} fileCategory="general" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href={`/profile/memo/${id}`}>
              <Button variant="outline">{tCommon("cancel")}</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!title || updateMemo.isPending}>
              {updateMemo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("memo.edit.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
