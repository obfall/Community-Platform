"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  useVenue,
  useReservations,
  useCreateReservation,
  useCancelReservation,
} from "@/hooks/use-venues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, Calendar, Loader2 } from "lucide-react";

const VENUE_TYPE_LABELS: Record<string, string> = {
  theater: "劇場",
  concert_hall: "コンサートホール",
  conference_room: "会議室",
  stadium: "スタジアム",
  outdoor: "屋外",
  other: "その他",
};

const PUBLISH_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
  archived: "アーカイブ",
};

interface VenueImageItem {
  id: string;
  file: { publicUrl: string | null };
}

export default function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: venue, isLoading } = useVenue(id);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!venue)
    return <div className="py-12 text-center text-muted-foreground">施設が見つかりません</div>;

  const venueImages =
    (venue as unknown as { images?: VenueImageItem[] }).images?.filter(
      (img) => img.file.publicUrl,
    ) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/venues">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="outline">{VENUE_TYPE_LABELS[venue.venueType] ?? venue.venueType}</Badge>
            <Badge variant="secondary">
              {PUBLISH_STATUS_LABELS[venue.publishStatus] ?? venue.publishStatus}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{venue.name}</h1>
        </div>
      </div>

      {venueImages.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {venueImages.map((img) => (
            <div key={img.id} className="aspect-video overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.file.publicUrl!}
                alt={venue.name}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">住所</div>
              <div className="font-medium">{venue.address ?? "-"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">定員</div>
              <div className="font-medium">
                {venue.capacity != null ? `${venue.capacity}人` : "-"}
              </div>
            </div>
          </div>
          {venue.description && (
            <div className="mt-4 whitespace-pre-wrap text-sm">{venue.description}</div>
          )}
          {venue.accessInfo && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">アクセス情報</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{venue.accessInfo}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            スペース一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {venue.spaces.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">スペースがありません</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead className="text-right">定員</TableHead>
                    <TableHead>予約可否</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venue.spaces.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.spaceType ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.capacity != null ? `${s.capacity}人` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.isReservable ? "default" : "secondary"}>
                          {s.isReservable ? "可" : "不可"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {venue.spaces.filter((s) => s.isReservable).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              予約
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>スペース</Label>
              <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="スペースを選択" />
                </SelectTrigger>
                <SelectContent>
                  {venue.spaces
                    .filter((s) => s.isReservable)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSpaceId && <ReservationSection spaceId={selectedSpaceId} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReservationSection({ spaceId }: { spaceId: string }) {
  const { data: reservations, isLoading } = useReservations(spaceId);
  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const handleSubmit = () => {
    createReservation.mutate(
      {
        spaceId,
        data: { title: title || undefined, startAt, endAt },
      },
      {
        onSuccess: () => {
          setTitle("");
          setStartAt("");
          setEndAt("");
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>タイトル（任意）</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="予約のタイトル"
          />
        </div>
        <div>
          <Label>開始日時</Label>
          <Input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div>
          <Label>終了日時</Label>
          <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={!startAt || !endAt || createReservation.isPending}>
        {createReservation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        予約する
      </Button>

      <div className="pt-4">
        <h4 className="mb-2 text-sm font-medium">予約一覧</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : !reservations || reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">予約はありません</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>開始</TableHead>
                  <TableHead>終了</TableHead>
                  <TableHead>予約者</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.title ?? "-"}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(r.startAt).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(r.endAt).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-sm">{r.user.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "confirmed"
                            ? "default"
                            : r.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelReservation.mutate(r.id)}
                          disabled={cancelReservation.isPending}
                        >
                          キャンセル
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
