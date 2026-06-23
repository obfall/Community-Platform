"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMyProfile } from "@/hooks/profile/use-profile";
import { usePointSummary } from "@/hooks/points/use-points";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Pencil, CalendarDays } from "lucide-react";
import { SelfAttributesView } from "./_components/self-attributes-view";

export default function MyPage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tRole = useTranslations("enums.role");
  const tOccupation = useTranslations("enums.occupation");
  const tGender = useTranslations("enums.gender");
  const tEventRole = useTranslations("enums.eventRole");
  const { user } = useAuth();
  const { data: profileData } = useMyProfile();
  const { data: pointSummary } = usePointSummary();

  const profile = profileData?.profile;
  const publicInfo = profileData?.publicInfo;
  const location = [publicInfo?.prefecture, publicInfo?.city].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("view.title")}</h2>

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
                <Badge variant="secondary">
                  {user?.role && tRole.has(user.role) ? tRole(user.role) : user?.role}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
              <div className="mt-2 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                <span className="font-medium">
                  {pointSummary?.availablePoints?.toLocaleString() ?? 0} {t("view.pointsSuffix")}
                </span>
                <span>|</span>
                <CalendarDays className="h-4 w-4" />
                <span>
                  {new Date(profileData?.createdAt ?? "").toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {t("view.joinedSuffix")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* プロフィール情報 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("view.profileInfo")}</CardTitle>
          <Link href="/profile/edit">
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              {t("view.edit")}
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">{t("view.nameKana")}</p>
              <p>{profile?.nameKana || tCommon("notSet")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("view.occupation")}</p>
              <p>
                {profile?.occupation
                  ? tOccupation.has(profile.occupation)
                    ? tOccupation(profile.occupation)
                    : profile.occupation
                  : tCommon("notSet")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("view.phone")}</p>
              <p>{profile?.phone || tCommon("notSet")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("view.birthday")}</p>
              <p>
                {profile?.birthday
                  ? new Date(profile.birthday).toLocaleDateString("ja-JP")
                  : tCommon("notSet")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("view.gender")}</p>
              <p>
                {profile?.gender
                  ? tGender.has(profile.gender)
                    ? tGender(profile.gender)
                    : profile.gender
                  : tCommon("notSet")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("view.countryOfOrigin")}</p>
              <p>{profile?.countryOfOrigin || tCommon("notSet")}</p>
            </div>
          </div>

          {/* 所属 */}
          {profileData?.affiliations && profileData.affiliations.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{t("view.affiliations")}</p>
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
          <CardTitle>{t("view.publicInfo")}</CardTitle>
          <Link href="/profile/public-info">
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              {t("view.edit")}
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">{t("view.nickname")}</p>
              <p>
                {publicInfo?.nickname || tCommon("notSet")}
                {publicInfo?.nicknameKana && (
                  <span className="ml-1 text-muted-foreground">({publicInfo.nicknameKana})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("view.publicStatus")}</p>
              <Badge variant={publicInfo?.publicStatus === "public" ? "default" : "secondary"}>
                {publicInfo?.publicStatus === "public" ? t("view.public") : t("view.private")}
              </Badge>
            </div>
          </div>

          {/* 活動拠点 */}
          {location && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t("view.location")}</p>
              <p className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {location}
              </p>
            </div>
          )}

          {/* 専門分野 */}
          {publicInfo?.specialty && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{t("view.specialty")}</p>
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
              <p className="mb-2 text-xs text-muted-foreground">{t("view.eventRole")}</p>
              <div className="flex flex-wrap gap-1.5">
                {publicInfo.eventRole.split(",").map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {tEventRole.has(r) ? tEventRole(r) : r}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 自己紹介 */}
          {publicInfo?.introduction && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t("view.introduction")}</p>
              <p className="whitespace-pre-wrap">{publicInfo.introduction}</p>
            </div>
          )}

          {/* 興味分野 */}
          {profileData?.interests && profileData.interests.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{t("view.interests")}</p>
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
