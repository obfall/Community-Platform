"use client";

import { use } from "react";
import Link from "next/link";
import { Pencil, Users, Paperclip, Download } from "lucide-react";
import { useAuth } from "@/hooks/auth/use-auth";
import { useEvent } from "@/hooks/events/use-events";
import { useEventResult } from "@/hooks/events/use-event-results";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventExecutionStatus, EventResultAttachment } from "@/lib/api/types";

const EXECUTION_STATUS_LABELS: Record<EventExecutionStatus, string> = {
  as_planned: "予定通り実施",
  modified: "一部変更あり",
  partially_held: "一部開催",
  postponed: "延期",
  canceled: "中止",
};

const EXECUTION_STATUS_CLASS: Record<EventExecutionStatus, string> = {
  as_planned: "bg-green-100 text-green-800 border-green-200",
  modified: "bg-yellow-100 text-yellow-800 border-yellow-200",
  partially_held: "bg-yellow-100 text-yellow-800 border-yellow-200",
  postponed: "bg-orange-100 text-orange-800 border-orange-200",
  canceled: "bg-red-100 text-red-800 border-red-200",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentItem({ attachment }: { attachment: EventResultAttachment }) {
  const isImage = attachment.file.contentType.startsWith("image/");
  const url = attachment.file.publicUrl;

  if (isImage && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group overflow-hidden rounded-lg border bg-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={attachment.file.originalName}
          className="aspect-video w-full object-cover transition-opacity group-hover:opacity-90"
        />
        <div className="p-2 text-xs text-muted-foreground">{attachment.file.originalName}</div>
      </a>
    );
  }

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted"
    >
      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 truncate">
        <p className="truncate text-sm font-medium">{attachment.file.originalName}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file.fileSizeBytes)}
        </p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

export default function EventResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: event } = useEvent(id);
  const { data: result, isLoading } = useEventResult(id);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!result) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">実施結果</h1>
            {event && <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>}
          </div>
          {isAdmin && (
            <Link href={`/events/${id}/results/edit`}>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                実施結果を作成
              </Button>
            </Link>
          )}
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            実施結果はまだ登録されていません
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDraftOrPrivate = result.status !== "completed" || result.publishStatus !== "public";

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={EXECUTION_STATUS_CLASS[result.executionStatus]}>
              {EXECUTION_STATUS_LABELS[result.executionStatus]}
            </Badge>
            {isAdmin && isDraftOrPrivate && (
              <Badge variant="secondary">{result.status === "draft" ? "下書き" : "非公開"}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">実施結果</h1>
          {event && <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>}
        </div>
        {isAdmin && (
          <Link href={`/events/${id}/results/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
        )}
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              参加者数
            </div>
            <p className="mt-1 text-2xl font-bold">
              {result.attendanceCount}
              <span className="ml-1 text-sm font-normal text-muted-foreground">人</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">出席率</p>
            <p className="mt-1 text-2xl font-bold">
              {result.attendanceRate != null ? `${result.attendanceRate.toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">申込者数</p>
            <p className="mt-1 text-2xl font-bold">
              {event?.participantCount ?? "—"}
              {event && <span className="ml-1 text-sm font-normal text-muted-foreground">人</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {result.summary && (
        <Card>
          <CardHeader>
            <CardTitle>実施結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">{result.summary}</div>
          </CardContent>
        </Card>
      )}

      {result.achievementNotes && (
        <Card>
          <CardHeader>
            <CardTitle>目的達成度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">{result.achievementNotes}</div>
          </CardContent>
        </Card>
      )}

      {result.improvementNotes && (
        <Card>
          <CardHeader>
            <CardTitle>改善要望</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">{result.improvementNotes}</div>
          </CardContent>
        </Card>
      )}

      {result.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>添付ファイル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.attachments.map((a) => (
                <AttachmentItem key={a.id} attachment={a} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
