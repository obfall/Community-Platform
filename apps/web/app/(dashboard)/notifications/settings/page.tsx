"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreferenceForm } from "../_components/preference-form";

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notifications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">通知設定</h1>
          <p className="mt-1 text-muted-foreground">通知の受信方法を設定します</p>
        </div>
      </div>

      <PreferenceForm />
    </div>
  );
}
