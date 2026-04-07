"use client";

import { useState } from "react";
import Link from "next/link";
import { useVenues } from "@/hooks/use-venues";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Building2 } from "lucide-react";

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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>施設名</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>住所</TableHead>
                <TableHead className="text-right">定員</TableHead>
                <TableHead className="text-right">スペース数</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Link
                      href={`/venues/${v.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {v.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{VENUE_TYPE_LABELS[v.venueType] ?? v.venueType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.address ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {v.capacity != null ? `${v.capacity}人` : "-"}
                  </TableCell>
                  <TableCell className="text-right">{v._count.spaces}</TableCell>
                  <TableCell>
                    <Badge variant={v.publishStatus === "published" ? "default" : "secondary"}>
                      {PUBLISH_STATUS_LABELS[v.publishStatus] ?? v.publishStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
