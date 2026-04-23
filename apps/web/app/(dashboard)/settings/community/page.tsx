"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSettingsForm } from "./_components/app-settings-form";
import { DesignSettingsForm } from "./_components/design-settings-form";
import { EmailSettingsForm } from "./_components/email-settings-form";
import { AttributesForm } from "./_components/attributes-form";

export default function CommunitySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">コミュニティ設定</h1>
        <p className="mt-1 text-muted-foreground">コミュニティの基本設定を管理します</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">基本設定</TabsTrigger>
          <TabsTrigger value="design">デザイン</TabsTrigger>
          <TabsTrigger value="email">メール</TabsTrigger>
          <TabsTrigger value="attributes">カスタム属性</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <AppSettingsForm />
        </TabsContent>

        <TabsContent value="design" className="mt-6">
          <DesignSettingsForm />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailSettingsForm />
        </TabsContent>

        <TabsContent value="attributes" className="mt-6">
          <AttributesForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
