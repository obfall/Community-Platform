"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSkill, useCreateBooking, useDeleteSkill } from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Clock, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CommentSection } from "./_components/comment-section";

const FORMAT_VALUES = ["online", "offline", "both"] as const;
type FormatKey = (typeof FORMAT_VALUES)[number];

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("skills");
  const tFormat = useTranslations("skills.format");
  const { user, canEditAuthor, isAdmin } = useAuth();
  const { data: skill, isLoading } = useSkill(id);
  const createBooking = useCreateBooking();
  const deleteSkill = useDeleteSkill();
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const handleBook = () => {
    createBooking.mutate(
      {
        listingId: id,
        data: { message: message || undefined, scheduledAt: scheduledAt || undefined },
      },
      {
        onSuccess: (booking) => {
          setMessage("");
          setScheduledAt("");
          toast.success(t("toast.bookingRequested"));
          router.push(`/skills/bookings/${booking.id}`);
        },
      },
    );
  };

  const handleDelete = () => {
    if (confirm(t("detail.deleteConfirm"))) {
      deleteSkill.mutate(id, { onSuccess: () => router.push("/skills") });
    }
  };

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">{t("detail.loading")}</div>;
  if (!skill)
    return <div className="py-12 text-center text-muted-foreground">{t("detail.notFound")}</div>;

  const isOwner = user?.id === skill.provider.id;
  const canEdit = canEditAuthor(skill.provider.id);
  // 予約フォームは出品者本人と管理者には表示しない
  const canBook = !isOwner && !isAdmin;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/skills">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{skill.title}</h1>
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/skills/${id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("detail.menu.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
                disabled={deleteSkill.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("detail.menu.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline">
              {isFormatKey(skill.format) ? tFormat(skill.format) : skill.format}
            </Badge>
            {skill.category && <Badge variant="secondary">{skill.category.name}</Badge>}
          </div>

          <div className="mb-4 flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{skill.provider.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{skill.provider.name}</div>
              <div className="text-sm text-muted-foreground">{t("detail.provider")}</div>
            </div>
          </div>

          {skill.description && (
            <div className="mb-4 whitespace-pre-wrap text-sm">{skill.description}</div>
          )}

          <div className="flex items-center gap-6 border-t pt-4">
            <div>
              <div className="text-2xl font-bold">¥{skill.price.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("detail.price")}</div>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {t("list.duration", { minutes: skill.durationMinutes })}
                </div>
                <div className="text-xs text-muted-foreground">{t("detail.duration")}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {canBook && (
        <Card>
          <CardHeader>
            <CardTitle>{t("booking.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("booking.scheduledAtLabel")}</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("booking.messageLabel")}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("booking.messagePlaceholder")}
                rows={3}
              />
            </div>
            <Button onClick={handleBook} disabled={createBooking.isPending} className="w-full">
              {createBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("booking.submit")}
            </Button>
          </CardContent>
        </Card>
      )}

      <CommentSection listingId={id} providerId={skill.provider.id} />
    </div>
  );
}

function isFormatKey(v: string): v is FormatKey {
  return (FORMAT_VALUES as readonly string[]).includes(v);
}
