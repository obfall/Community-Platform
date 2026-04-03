"use client";

import { AdminGuard } from "@/components/admin-guard";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
