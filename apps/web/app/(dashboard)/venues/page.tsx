"use client";

import { useState } from "react";
import Link from "next/link";
import { useVenues } from "@/hooks/venues/use-venues";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Users, MapPin } from "lucide-react";
import { SelectField } from "@/components/select-field";
import { HighlightedText } from "@/components/highlighted-text";
import { PUBLISH_STATUS_LABELS, PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { VENUE_TYPE_LABELS } from "@/lib/constants/venue-types";

export default function VenuesPage() {
  const [publishStatus, setPublishStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const { data: venues, isLoading } = useVenues({ publishStatus, search });
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">施設・スペース</h1>
        {isAdmin && (
          <Link href="/venues/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              施設登録
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput || undefined)}
          placeholder="施設を検索..."
          className="max-w-xs"
        />
        <SelectField
          value={publishStatus}
          onChange={setPublishStatus}
          options={PUBLISH_STATUS_OPTIONS}
          includeAll
          placeholder="ステータス"
          className="w-36"
        />
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
                    <h3 className="line-clamp-1 font-semibold">
                      <HighlightedText html={v.titleHighlighted} fallback={v.name} />
                    </h3>
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
