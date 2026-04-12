"use client";

import { PublicInfoForm } from "../_components/public-info-form";

export default function ProfilePublicInfoPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">公開情報編集</h2>
      <PublicInfoForm />
    </div>
  );
}
