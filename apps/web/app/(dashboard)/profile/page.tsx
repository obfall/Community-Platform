"use client";

import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProfileForm } from "./_components/profile-form";
import { PublicInfoForm } from "./_components/public-info-form";

const ROLE_LABELS: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  moderator: "モデレーター",
  member: "メンバー",
};

export default function ProfilePage() {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">プロフィール</h1>
        <p className="mt-1 text-muted-foreground">あなたのプロフィール情報を管理します</p>
      </div>

      {/* 基本情報カード */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-bold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 編集タブ */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">プロフィール</TabsTrigger>
          <TabsTrigger value="public-info">公開情報</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileForm />
        </TabsContent>

        <TabsContent value="public-info" className="mt-6">
          <PublicInfoForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
