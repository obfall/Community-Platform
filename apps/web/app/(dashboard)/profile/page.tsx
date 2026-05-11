"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMyProfile } from "@/hooks/profile/use-profile";
import { usePointSummary } from "@/hooks/points/use-points";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Pencil, CalendarDays } from "lucide-react";
import { SelfAttributesView } from "./_components/self-attributes-view";

const ROLE_LABELS: Record<string, string> = {
  owner: "運営者",
  admin: "管理者",
  moderator: "モデレーター",
  member: "メンバー",
};

const OCCUPATION_LABELS: Record<string, string> = {
  company_employee: "会社員",
  student: "学生",
  self_employed: "自営業",
  homemaker: "主婦",
  unemployed: "無職",
  other: "その他",
};

const EVENT_ROLE_LABELS: Record<string, string> = {
  lecturer: "講師",
  mc: "司会",
  interpreter: "通訳",
  planner: "企画",
  panelist: "パネリスト",
  performer: "出演",
};

export default function MyPage() {
  const { user } = useAuth();
  const { data: profileData } = useMyProfile();
  const { data: pointSummary } = usePointSummary();

  const profile = profileData?.profile;
  const publicInfo = profileData?.publicInfo;
  const location = [
    publicInfo?.prefecture,
    publicInfo?.city,
    publicInfo?.foreignCountry,
    publicInfo?.foreignCity,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">プロフィール</h2>

      {/* ヒーロー（基本情報） */}
      <Card className="overflow-hidden py-0">
        {profile?.headerImageUrl && (
          <div className="h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.headerImageUrl}
              alt=""
              className="h-full w-full rounded-t-xl object-cover"
            />
          </div>
        )}
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <Avatar
              className={`h-28 w-28 ${profile?.headerImageUrl ? "-mt-24 ring-4 ring-background" : ""}`}
            >
              <AvatarImage src={profile?.avatarUrl ?? undefined} alt={user?.name} />
              <AvatarFallback className="text-2xl">{user?.name?.slice(0, 2) ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="mt-3 text-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <h1 className="text-2xl font-bold">{user?.name}</h1>
                <Badge variant="secondary">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
              <div className="mt-2 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                <span className="font-medium">
                  {pointSummary?.availablePoints?.toLocaleString() ?? 0} ポイント
                </span>
                <span>|</span>
                <CalendarDays className="h-4 w-4" />
                <span>
                  {new Date(profileData?.createdAt ?? "").toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  に参加
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* プロフィール情報 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>プロフィール情報</CardTitle>
          <Link href="/profile/edit">
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">名前（カナ）</p>
              <p>{profile?.nameKana || "未設定"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">職業</p>
              <p>
                {profile?.occupation
                  ? (OCCUPATION_LABELS[profile.occupation] ?? profile.occupation)
                  : "未設定"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">電話番号</p>
              <p>{profile?.phone || "未設定"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">誕生日</p>
              <p>
                {profile?.birthday
                  ? new Date(profile.birthday).toLocaleDateString("ja-JP")
                  : "未設定"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">性別</p>
              <p>
                {profile?.gender
                  ? ({
                      male: "男性",
                      female: "女性",
                      other: "その他",
                      prefer_not_to_say: "回答しない",
                    }[profile.gender] ?? profile.gender)
                  : "未設定"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">出身国</p>
              <p>{profile?.countryOfOrigin || "未設定"}</p>
            </div>
          </div>

          {/* 所属 */}
          {profileData?.affiliations && profileData.affiliations.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">所属 / 部署 / 肩書</p>
              <div className="space-y-2">
                {profileData.affiliations.map((aff) => (
                  <p key={aff.id} className="text-sm">
                    {aff.organizationName}
                    {aff.roleDescription && ` / ${aff.roleDescription}`}
                    {aff.title && ` / ${aff.title}`}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 公開情報 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>公開情報</CardTitle>
          <Link href="/profile/public-info">
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">ニックネーム</p>
              <p>
                {publicInfo?.nickname || "未設定"}
                {publicInfo?.nicknameKana && (
                  <span className="ml-1 text-muted-foreground">({publicInfo.nicknameKana})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">公開ステータス</p>
              <Badge variant={publicInfo?.publicStatus === "public" ? "default" : "secondary"}>
                {publicInfo?.publicStatus === "public" ? "公開" : "非公開"}
              </Badge>
            </div>
          </div>

          {/* 活動拠点 */}
          {location && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">活動拠点</p>
              <p className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {location}
              </p>
            </div>
          )}

          {/* 専門分野 */}
          {publicInfo?.specialty && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">専門分野</p>
              <div className="flex flex-wrap gap-1.5">
                {publicInfo.specialty.split(",").map((s) => {
                  const label = s.includes("/") ? s.split("/")[1] : s;
                  return (
                    <Badge key={s} variant="outline" className="text-xs">
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* イベント役割 */}
          {publicInfo?.eventRole && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">イベント役割</p>
              <div className="flex flex-wrap gap-1.5">
                {publicInfo.eventRole.split(",").map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {EVENT_ROLE_LABELS[r] ?? r}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 自己紹介 */}
          {publicInfo?.introduction && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">自己紹介</p>
              <p className="whitespace-pre-wrap">{publicInfo.introduction}</p>
            </div>
          )}

          {/* 興味分野 */}
          {profileData?.interests && profileData.interests.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">興味分野</p>
              <div className="flex flex-wrap gap-2">
                {profileData.interests.map((interest) => (
                  <Badge key={interest.id} variant="outline">
                    {interest.categoryName}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SelfAttributesView />
    </div>
  );
}
