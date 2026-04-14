"use client";

import { useState } from "react";
import Link from "next/link";
import { useVenues } from "@/hooks/venues/use-venues";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, Users, MapPin } from "lucide-react";

const VENUE_TYPE_LABELS: Record<string, string> = {
  theater: "劇場",
  concert_hall: "コンサート（音楽）ホール",
  lecture_hall: "講演ホール",
  plaza: "広場",
  classroom_large: "教室(大)",
  exhibition_hall: "展示ホール",
  reception_hall: "レセプションホール",
  dining_space: "飲食スペース",
  conference_room_large: "会議室(大)",
  live_house: "ライブハウス",
  gymnasium: "体育館",
  other: "その他",
};

const PUBLISH_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
  archived: "アーカイブ",
};

export default function VenuesPage() {
  const [publishStatus, setPublishStatus] = useState("all");
  const { data: venues, isLoading } = useVenues({ publishStatus });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">施設・スペース</h1>
        <Link href="/venues/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            施設登録
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={publishStatus} onValueChange={setPublishStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="published">公開</SelectItem>
            <SelectItem value="archived">アーカイブ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : !venues || venues.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-4 h-12 w-12" />
          <p>施設がありません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => {
            const imageUrl = v.images?.[0]?.file.publicUrl;
            return (
              <Link key={v.id} href={`/venues/${v.id}`}>
                <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={v.name} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      {v.venueTypes.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {VENUE_TYPE_LABELS[t] ?? t}
                        </Badge>
                      ))}
                      {v.publishStatus !== "published" && (
                        <Badge variant="secondary" className="text-xs">
                          {PUBLISH_STATUS_LABELS[v.publishStatus] ?? v.publishStatus}
                        </Badge>
                      )}
                    </div>
                    <h3 className="line-clamp-1 font-semibold">{v.name}</h3>
                    {v.address && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        {v.address}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      {v.capacity != null && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {v.capacity}人
                        </span>
                      )}
                      <span>{v._count.spaces}スペース</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
