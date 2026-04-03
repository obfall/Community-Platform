"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSettingsForm } from "./_components/app-settings-form";
import { FeatureToggles } from "./_components/feature-toggles";

export default function CommunitySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">コミュニティ設定</h1>
        <p className="mt-1 text-muted-foreground">
          コミュニティの基本設定と機能の有効/無効を管理します
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">基本設定</TabsTrigger>
          <TabsTrigger value="features">機能設定</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <AppSettingsForm />
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <FeatureToggles />
        </TabsContent>
      </Tabs>
    </div>
  );
}
