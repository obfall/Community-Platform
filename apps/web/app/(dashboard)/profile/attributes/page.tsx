"use client";

import { SelfAttributesForm } from "../_components/self-attributes-form";

export default function ProfileAttributesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">カスタム属性編集</h2>
      <SelfAttributesForm />
    </div>
  );
}
