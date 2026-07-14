"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemoDetail, useDeleteMemo } from "@/hooks/memo/use-memo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Pencil, Trash2, Paperclip, MoreHorizontal } from "lucide-react";

export default function MemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = useMemoDetail(id);
  const deleteMemo = useDeleteMemo();

  const handleDelete = () => {
    if (confirm(t("memo.detail.deleteConfirm"))) {
      deleteMemo.mutate(id, { onSuccess: () => router.push("/profile/memo") });
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>;
  }
  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">{t("memo.detail.notFound")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/profile/memo">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/profile/memo/${id}/edit`}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                {t("memo.detail.edit")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {t("memo.detail.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {data.category && <Badge variant="outline">{data.category.name}</Badge>}
          <h1 className="text-2xl font-bold">{data.title}</h1>
          {data.body && (
            <div className="prose max-w-none whitespace-pre-wrap text-sm">{data.body}</div>
          )}
          {data.attachments && data.attachments.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">{t("memo.detail.attachments")}</h3>
              {data.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.file.publicUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Paperclip className="h-3 w-3" />
                  {a.file.originalName}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
