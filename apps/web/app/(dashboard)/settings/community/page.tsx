"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSettingsForm } from "./_components/app-settings-form";
import { DesignSettingsForm } from "./_components/design-settings-form";
import { EmailSettingsForm } from "./_components/email-settings-form";
import { AttributesForm } from "./_components/attributes-form";

export default function CommunitySettingsPage() {
  const t = useTranslations("settings.community");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="design">{t("tabs.design")}</TabsTrigger>
          <TabsTrigger value="email">{t("tabs.email")}</TabsTrigger>
          <TabsTrigger value="attributes">{t("tabs.attributes")}</TabsTrigger>
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
