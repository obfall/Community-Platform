"use client";

import { ProfileForm } from "../_components/profile-form";

export default function ProfileEditPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">プロフィール編集</h2>
      <ProfileForm />
    </div>
  );
}
