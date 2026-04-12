"use client";

import { use } from "react";
import Link from "next/link";
import {
  useMember,
  useMemberEvents,
  useMemberProjects,
  useStartDm,
} from "@/hooks/members/use-members";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageCircle, MapPin, CalendarDays, FolderKanban, Users } from "lucide-react";
import type { UserEventItem, UserProjectItem } from "@/lib/api/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  owner: "運営者",
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

const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  recruiting: "募集中",
  closed: "締切",
  canceled: "中止",
  ended: "終了",
};

const EVENT_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  recruiting: "default",
  closed: "outline",
  canceled: "destructive",
  ended: "outline",
  draft: "secondary",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "進行中",
  completed: "完了",
  archived: "アーカイブ",
  draft: "下書き",
};

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: member, isLoading } = useMember(id);
  const { data: events } = useMemberEvents(id);
  const { data: projects } = useMemberProjects(id);
  const startDm = useStartDm();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!member) {
    return <div className="py-12 text-center text-muted-foreground">メンバーが見つかりません</div>;
  }

  const isPublic = member.publicInfo?.publicStatus === "public";
  const publicInfo = isPublic ? member.publicInfo : null;
  const isOwnProfile = user?.id === member.id;
  const location = [
    publicInfo?.prefecture,
    publicInfo?.city,
    publicInfo?.foreignCountry,
    publicInfo?.foreignCity,
  ]
    .filter(Boolean)
    .join(" ");

  const introduction = publicInfo?.introduction ?? null;

  return (
    <div className="space-y-6">
      {/* 戻るリンク */}
      <Link href="/members">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          メンバー一覧
        </Button>
      </Link>

      {/* ヒーロー */}
      <Card className="overflow-hidden py-0">
        {member.profile?.headerImageUrl && (
          <div className="h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.profile.headerImageUrl}
              alt=""
              className="h-full w-full rounded-t-xl object-cover"
            />
          </div>
        )}
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <Avatar
              className={`h-28 w-28 ${member.profile?.headerImageUrl ? "-mt-24 ring-4 ring-background" : ""}`}
            >
              <AvatarImage src={member.profile?.avatarUrl ?? undefined} alt={member.name} />
              <AvatarFallback className="text-2xl">{member.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="mt-3 text-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <h1 className="text-2xl font-bold">{member.name}</h1>
                <Badge variant="secondary">{ROLE_LABELS[member.role] ?? member.role}</Badge>
              </div>
              {publicInfo?.nickname && (
                <p className="text-sm text-muted-foreground">@{publicInfo.nickname}</p>
              )}
              <p className="mt-2 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(member.createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                に参加
              </p>
            </div>
            {!isOwnProfile && (
              <Button
                className="mt-4"
                onClick={() => startDm.mutate(member.id)}
                disabled={startDm.isPending}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                チャット
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* プロフィール情報 */}
      <Card>
        <CardHeader>
          <CardTitle>プロフィール情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            {publicInfo?.nickname && (
              <div>
                <p className="text-xs text-muted-foreground">ニックネーム</p>
                <p>
                  {publicInfo.nickname}
                  {publicInfo.nicknameKana && (
                    <span className="ml-1 text-muted-foreground">({publicInfo.nicknameKana})</span>
                  )}
                </p>
              </div>
            )}
            {member.profile?.occupation && (
              <div>
                <p className="text-xs text-muted-foreground">職業</p>
                <p>{OCCUPATION_LABELS[member.profile.occupation] ?? member.profile.occupation}</p>
              </div>
            )}
            {member.profile?.countryOfOrigin && (
              <div>
                <p className="text-xs text-muted-foreground">出身国</p>
                <p>{member.profile.countryOfOrigin}</p>
              </div>
            )}
            {member.profile?.website && (
              <div>
                <p className="text-xs text-muted-foreground">Webサイト</p>
                <a
                  href={member.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {member.profile.website}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">参加日</p>
              <p>
                {new Date(member.createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {member.affiliations.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">所属 / 部署 / 肩書</p>
              <div className="space-y-2">
                {member.affiliations.map((aff) => (
                  <p key={aff.id}>
                    {aff.organizationName}
                    {aff.roleDescription && ` / ${aff.roleDescription}`}
                    {aff.title && ` / ${aff.title}`}
                  </p>
                ))}
              </div>
            </div>
          )}

          {member.languages.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">使用言語</p>
              <div className="flex flex-wrap gap-2">
                {member.languages.map((lang) => (
                  <Badge key={lang.id} variant="secondary">
                    {lang.languageCode}
                    {lang.proficiency && ` (${lang.proficiency})`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 公開情報 */}
      <Card>
        <CardHeader>
          <CardTitle>公開情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {location && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">活動拠点</p>
              <p className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {location}
              </p>
            </div>
          )}

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

          {introduction && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">自己紹介</p>
              <p className="whitespace-pre-wrap">{introduction}</p>
            </div>
          )}

          {member.interests.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">興味分野</p>
              <div className="flex flex-wrap gap-2">
                {member.interests.map((interest) => (
                  <Badge key={interest.id} variant="outline">
                    {interest.categoryName}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* イベント・プロジェクト */}
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">
            イベント{events && events.length > 0 && ` (${events.length})`}
          </TabsTrigger>
          <TabsTrigger value="projects">
            プロジェクト{projects && projects.length > 0 && ` (${projects.length})`}
          </TabsTrigger>
        </TabsList>

        {/* イベントタブ */}
        <TabsContent value="events">
          {!events || events.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarDays className="mx-auto mb-4 h-12 w-12" />
              <p>参加イベントはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: UserEventItem) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <CalendarDays className="h-8 w-8 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.startAt).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.category && (
                          <Badge variant="outline" className="text-xs">
                            {event.category.name}
                          </Badge>
                        )}
                        <Badge
                          variant={EVENT_STATUS_VARIANTS[event.status] ?? "secondary"}
                          className="text-xs"
                        >
                          {EVENT_STATUS_LABELS[event.status] ?? event.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* プロジェクトタブ */}
        <TabsContent value="projects">
          {!projects || projects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FolderKanban className="mx-auto mb-4 h-12 w-12" />
              <p>参加プロジェクトはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project: UserProjectItem) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <FolderKanban className="h-8 w-8 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{project.name}</p>
                        {project.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {project.memberCount}
                        </span>
                        {project.category && (
                          <Badge variant="outline" className="text-xs">
                            {project.category.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
