"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useContent, useDeleteContent } from "@/hooks/content/use-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";

const CONTENT_TYPE_KEYS = ["meal_drink", "product", "tourist_spot", "room_space"] as const;
type ContentTypeKey = (typeof CONTENT_TYPE_KEYS)[number];

export default function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("contents");
  const tCommon = useTranslations("common");
  const { id } = use(params);
  const router = useRouter();
  const { data: content, isLoading } = useContent(id);
  const deleteContent = useDeleteContent();

  const handleDelete = () => {
    if (confirm(t("detail.deleteConfirm"))) {
      deleteContent.mutate(id, { onSuccess: () => router.push("/content") });
    }
  };

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>;
  if (!content)
    return <div className="py-12 text-center text-muted-foreground">{t("detail.notFound")}</div>;

  const typeLabel = CONTENT_TYPE_KEYS.includes(content.contentType as ContentTypeKey)
    ? t(`type.${content.contentType as ContentTypeKey}`)
    : content.contentType;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/content">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="outline">{t(`status.${content.publishStatus}`)}</Badge>
            <Badge variant="secondary">{typeLabel}</Badge>
          </div>
          <h1 className="text-2xl font-bold">{content.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {content.createdBy.name} ・ {new Date(content.createdAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/content/${content.id}/edit`}>
            <Button variant="outline" size="sm">
              {t("detail.edit")}
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteContent.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("detail.delete")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {content.coverImageUrl ? (
            <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.coverImageUrl}
                alt={content.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-muted">
              <FileText className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {content.description && (
            <div className="whitespace-pre-wrap text-sm">{content.description}</div>
          )}

          {content.price != null && content.price > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="text-2xl font-bold">¥{content.price.toLocaleString()}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
