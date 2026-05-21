"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useSkillBooking,
  useSkillMessages,
  useSendSkillMessage,
  useUpdateBookingStatus,
} from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, CalendarClock, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import type { SkillBookingStatus } from "@/lib/api/types";

const STATUS_VARIANT: Record<
  SkillBookingStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  requested: "secondary",
  approved: "default",
  rejected: "destructive",
  completed: "default",
  canceled: "outline",
};

type StatusDialogKind = "rejected" | "canceled" | "approved" | "completed";
type DialogState = { kind: StatusDialogKind } | null;

const FORMAT_VALUES = ["online", "offline", "both"] as const;
type FormatKey = (typeof FORMAT_VALUES)[number];

export default function SkillBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const t = useTranslations("skills");
  const tBookingDetail = useTranslations("skills.bookingDetail");
  const tStatus = useTranslations("skills.bookingStatus");
  const tFormat = useTranslations("skills.format");
  const tBookings = useTranslations("skills.bookings");
  const { user, isAdmin } = useAuth();
  const { data: booking, isLoading: isBookingLoading } = useSkillBooking(bookingId);
  const { data: messages, isLoading: isMessagesLoading } = useSkillMessages(bookingId);
  const sendMessage = useSendSkillMessage();
  const updateStatus = useUpdateBookingStatus();

  const [body, setBody] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [comment, setComment] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!body.trim()) return;
    sendMessage.mutate({ bookingId, body: body.trim() }, { onSuccess: () => setBody("") });
  };

  const openDialog = (kind: StatusDialogKind) => {
    setComment("");
    setDialog({ kind });
  };

  const handleConfirm = () => {
    if (!dialog) return;
    updateStatus.mutate(
      { bookingId, status: dialog.kind, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          setDialog(null);
          setComment("");
          toast.success(t("toast.bookingStatusUpdated", { label: tStatus(dialog.kind) }));
        },
      },
    );
  };

  if (isBookingLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">{tBookingDetail("loading")}</div>
    );
  }
  if (!booking) {
    return (
      <div className="py-12 text-center text-muted-foreground">{tBookingDetail("notFound")}</div>
    );
  }

  const isProvider = user?.id === booking.providerUserId;
  const isRequester = user?.id === booking.requesterUserId;
  // admin/owner は provider 視点で表示
  const showAsProvider = isProvider || (isAdmin && !isRequester);
  const counterpart = showAsProvider ? booking.requester : booking.provider;
  const status = booking.status;

  // ボタン表示の可否
  // 提供者視点: 承認/拒否 (requested) + キャンセル/完了 (approved)
  // リクエスター視点: キャンセル (requested or approved)
  const isActive = status === "requested" || status === "approved";
  const canApprove = showAsProvider && status === "requested";
  const canReject = showAsProvider && status === "requested";
  const canComplete = showAsProvider && status === "approved";
  const canProviderCancel = showAsProvider && status === "approved";
  const canRequesterCancel = !showAsProvider && isActive;

  const dialogText = dialog
    ? {
        title: tBookingDetail(
          dialog.kind === "rejected"
            ? "dialog.rejectTitle"
            : dialog.kind === "canceled"
              ? "dialog.cancelTitle"
              : dialog.kind === "approved"
                ? "dialog.approveTitle"
                : "dialog.completeTitle",
        ),
        description: tBookingDetail(
          dialog.kind === "rejected"
            ? "dialog.rejectDescription"
            : dialog.kind === "canceled"
              ? "dialog.cancelDescription"
              : dialog.kind === "approved"
                ? "dialog.approveDescription"
                : "dialog.completeDescription",
        ),
        confirm: tBookingDetail(
          dialog.kind === "rejected"
            ? "dialog.rejectConfirm"
            : dialog.kind === "canceled"
              ? "dialog.cancelConfirm"
              : dialog.kind === "approved"
                ? "dialog.approveConfirm"
                : "dialog.completeConfirm",
        ),
      }
    : null;

  const isMutating = updateStatus.isPending;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/skills/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">{t("heading.bookingDetail")}</h1>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/skills/${booking.skillListing.id}`}
                className="font-semibold hover:underline"
              >
                {booking.skillListing.title}
              </Link>
              <div className="text-xs text-muted-foreground">
                {tBookings("counterpart", {
                  role: showAsProvider ? tBookings("requester") : tBookings("provider"),
                  name: counterpart.name,
                })}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[status]}>{tStatus(status)}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>¥{booking.skillListing.price.toLocaleString()}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("list.duration", { minutes: booking.skillListing.durationMinutes })}
            </span>
            <span>
              {isFormatKey(booking.skillListing.format)
                ? tFormat(booking.skillListing.format)
                : booking.skillListing.format}
            </span>
          </div>

          {booking.scheduledAt && (
            <div className="flex items-center gap-1 text-sm">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              {tBookingDetail("scheduledAt", {
                datetime: new Date(booking.scheduledAt).toLocaleString("ja-JP"),
              })}
            </div>
          )}

          {booking.message && (
            <div className="rounded bg-muted p-2 text-sm whitespace-pre-wrap">
              {booking.message}
            </div>
          )}

          {(canApprove || canReject || canComplete || canProviderCancel || canRequesterCancel) && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {canApprove && (
                <Button size="sm" onClick={() => openDialog("approved")} disabled={isMutating}>
                  {tBookingDetail("actions.approve")}
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openDialog("rejected")}
                  disabled={isMutating}
                >
                  {tBookingDetail("actions.reject")}
                </Button>
              )}
              {canComplete && (
                <Button size="sm" onClick={() => openDialog("completed")} disabled={isMutating}>
                  {tBookingDetail("actions.complete")}
                </Button>
              )}
              {(canProviderCancel || canRequesterCancel) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDialog("canceled")}
                  disabled={isMutating}
                >
                  {tBookingDetail("actions.cancel")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-1 flex-col overflow-hidden rounded-md border">
        <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
          {tBookingDetail("messages")}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isMessagesLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              {tBookingDetail("messagesLoading")}
            </div>
          ) : !messages?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              {tBookingDetail("messagesEmpty")}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="flex gap-2">
                  <Avatar className="shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {m.sender.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      {m.sender.name} ・{" "}
                      {new Date(m.createdAt).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="mt-1 rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                      {m.body}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t bg-background p-3">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={tBookingDetail("messageInputPlaceholder")}
          />
          <Button onClick={handleSend} disabled={!body.trim() || sendMessage.isPending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogText?.title}</DialogTitle>
            <DialogDescription>{dialogText?.description}</DialogDescription>
          </DialogHeader>
          {(dialog?.kind === "rejected" || dialog?.kind === "canceled") && (
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={tBookingDetail("dialog.reasonPlaceholder")}
              rows={3}
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={isMutating}>
              {tBookingDetail("dialog.close")}
            </Button>
            <Button
              variant={
                dialog?.kind === "rejected" || dialog?.kind === "canceled"
                  ? "destructive"
                  : "default"
              }
              onClick={handleConfirm}
              disabled={isMutating}
            >
              {dialogText?.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isFormatKey(v: string): v is FormatKey {
  return (FORMAT_VALUES as readonly string[]).includes(v);
}
