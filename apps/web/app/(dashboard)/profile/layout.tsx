"use client";

import { ProfileBreadcrumb } from "./_components/breadcrumb";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ProfileBreadcrumb />
      {children}
    </div>
  );
}
