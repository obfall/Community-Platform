"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/auth/use-auth";
import { useVenue, useCreateSpace } from "@/hooks/venues/use-venues";
import { ReservationSection } from "./_components/reservation-section";
import { ReservationDialog } from "./_components/reservation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Building2, Calendar, Loader2, Plus } from "lucide-react";
import { PUBLISH_STATUS_LABELS } from "@/lib/constants/publish-status";
import { VENUE_TYPE_LABELS, VENUE_TYPE_OPTIONS } from "@/lib/constants/venue-types";

interface VenueImageItem {
  id: string;
  file: { publicUrl: string | null };
}

export default function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const { data: venue, isLoading } = useVenue(id);
  const createSpace = useCreateSpace();
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceCapacity, setSpaceCapacity] = useState("");
  const [spaceTypes, setSpaceTypes] = useState<string[]>([]);

  const handleCreateSpace = () => {
    createSpace.mutate(
      {
        venueId: id,
        data: {
          name: spaceName,
          description: spaceDescription || undefined,
          capacity: spaceCapacity ? Number(spaceCapacity) : undefined,
          spaceTypes,
        },
      },
      {
        onSuccess: () => {
          setSpaceDialogOpen(false);
          setSpaceName("");
          setSpaceDescription("");
          setSpaceCapacity("");
          setSpaceTypes([]);
        },
      },
    );
  };

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
            {venue.venueTypes.map((t) => (
              <Badge key={t} variant="outline">
                {VENUE_TYPE_LABELS[t] ?? t}
              </Badge>
            ))}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            スペース一覧
          </CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setSpaceDialogOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              スペース追加
            </Button>
          )}
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
                      <TableCell>
                        {s.spaceTypes.length === 0 ? (
                          <span className="text-sm text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {s.spaceTypes.map((t) => (
                              <Badge key={t} variant="outline" className="text-xs">
                                {VENUE_TYPE_LABELS[t] ?? t}
                              </Badge>
                            ))}
                          </div>
                        )}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              予約
            </CardTitle>
            <Button size="sm" onClick={() => setReservationDialogOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              予約する
            </Button>
          </CardHeader>
          <CardContent>
            <ReservationSection venueId={id} />
          </CardContent>
        </Card>
      )}

      <ReservationDialog
        spaces={venue.spaces.filter((s) => s.isReservable).map((s) => ({ id: s.id, name: s.name }))}
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            イベント活用状況 ({venue.events.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {venue.events.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              この施設を使用しているイベントはありません
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>イベント名</TableHead>
                    <TableHead>開催日</TableHead>
                    <TableHead className="text-right">参加者数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venue.events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <Link href={`/events/${e.id}`} className="hover:underline">
                          {e.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(e.startAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">{e.participantCount}人</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={spaceDialogOpen} onOpenChange={setSpaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スペース追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>スペース名</Label>
              <Input
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="例: 会議室A"
                maxLength={200}
              />
            </div>
            <div>
              <Label>説明</Label>
              <Textarea
                value={spaceDescription}
                onChange={(e) => setSpaceDescription(e.target.value)}
                placeholder="説明（任意）"
                rows={3}
              />
            </div>
            <div>
              <Label>種別（複数選択可）</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {VENUE_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={spaceTypes.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        setSpaceTypes((prev) =>
                          checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value),
                        );
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>定員</Label>
              <Input
                type="number"
                value={spaceCapacity}
                onChange={(e) => setSpaceCapacity(e.target.value)}
                placeholder="任意"
                min="1"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateSpace}
              disabled={!spaceName || createSpace.isPending}
            >
              {createSpace.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登録
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
