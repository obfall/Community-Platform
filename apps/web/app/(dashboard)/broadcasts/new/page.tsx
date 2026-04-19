"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCreateAndSendBroadcast,
  useBroadcastTemplates,
} from "@/hooks/broadcasts/use-broadcasts";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BroadcastForm } from "@/components/broadcasts/broadcast-form";
import { AudienceSelectorGlobal } from "@/components/broadcasts/audience-selector-global";
import type { BroadcastTargetType } from "@/lib/api/types";

export default function NewBroadcastPage() {
  const router = useRouter();
  const create = useCreateAndSendBroadcast();
  const { data: templates } = useBroadcastTemplates();

  const [targetType, setTargetType] = useState<BroadcastTargetType>("all");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/broadcasts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">新規配信作成</h1>
      </div>

      <BroadcastForm
        templates={templates}
        audienceSelector={
          <AudienceSelectorGlobal targetType={targetType} onTargetTypeChange={setTargetType} />
        }
        onSubmit={(data) => {
          create.mutate(
            { ...data, scope: "global", targetType },
            { onSuccess: (broadcast) => router.push(`/broadcasts/${broadcast.id}`) },
          );
        }}
        isSubmitting={create.isPending}
      />
    </div>
  );
}
