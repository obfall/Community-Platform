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
import {
  ArrowLeft,
  MessageCircle,
  MapPin,
  Globe,
  Briefcase,
  GraduationCap,
  Languages,
  CalendarDays,
  FolderKanban,
  Users,
} from "lucide-react";
import type { UserEventItem, UserProjectItem } from "@/lib/api/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  owner: "運営者",
  moderator: "モデレーター",
  member: "メンバー",
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

  const publicInfo = member.publicInfo;
  const isOwnProfile = user?.id === member.id;
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
      {/* 戻るリンク */}
      <Link href="/members">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          メンバー一覧
        </Button>
      </Link>

      {/* ヒーロー */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={member.profile?.avatarUrl ?? undefined} alt={member.name} />
              <AvatarFallback className="text-2xl">{member.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{member.name}</h1>
              {publicInfo?.nickname && (
                <p className="text-sm text-muted-foreground">@{publicInfo.nickname}</p>
              )}
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge variant="secondary">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                {publicInfo?.specialty && <Badge variant="outline">{publicInfo.specialty}</Badge>}
              </div>
              {location && (
                <p className="mt-2 flex items-center justify-center gap-1 text-sm text-muted-foreground sm:justify-start">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </p>
              )}
            </div>
            {!isOwnProfile && (
              <Button onClick={() => startDm.mutate(member.id)} disabled={startDm.isPending}>
                <MessageCircle className="mr-2 h-4 w-4" />
                チャット
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* タブ */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">プロフィール</TabsTrigger>
          <TabsTrigger value="events">
            イベント{events && events.length > 0 && ` (${events.length})`}
          </TabsTrigger>
          <TabsTrigger value="projects">
            プロジェクト{projects && projects.length > 0 && ` (${projects.length})`}
          </TabsTrigger>
        </TabsList>

        {/* プロフィールタブ */}
        <TabsContent value="profile" className="space-y-6">
          {publicInfo?.introduction && (
            <Card>
              <CardHeader>
                <CardTitle>自己紹介</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{publicInfo.introduction}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            {/* 所属 */}
            {member.affiliations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    所属
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {member.affiliations.map((aff) => (
                      <div key={aff.id}>
                        <p className="text-sm font-medium">{aff.organizationName}</p>
                        {aff.title && <p className="text-xs text-muted-foreground">{aff.title}</p>}
                        {aff.roleDescription && (
                          <p className="text-xs text-muted-foreground">{aff.roleDescription}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {member.profile?.occupation && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{member.profile.occupation}</span>
                  </div>
                )}
                {member.profile?.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a
                      href={member.profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-primary hover:underline"
                    >
                      {member.profile.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>
                    {new Date(member.createdAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    に参加
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 興味分野 */}
            {member.interests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    興味分野
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {member.interests.map((interest) => (
                      <Badge key={interest.id} variant="outline">
                        {interest.categoryName}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 言語 */}
            {member.languages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    言語
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {member.languages.map((lang) => (
                      <div key={lang.id} className="flex items-center justify-between text-sm">
                        <span>{lang.languageCode}</span>
                        {lang.proficiency && <Badge variant="secondary">{lang.proficiency}</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

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
