"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCreateAndSendBroadcast,
  useBroadcastTemplates,
} from "@/hooks/broadcasts/use-broadcasts";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BroadcastForm } from "@/components/broadcasts/broadcast-form";
import { AudienceSelectorEvent } from "@/components/broadcasts/audience-selector-event";

export default function NewEventBroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const create = useCreateAndSendBroadcast();
  const { data: templates } = useBroadcastTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/events/${eventId}/broadcasts`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-xl font-semibold">新規配信作成</h2>
      </div>

      <BroadcastForm
        templates={templates}
        audienceSelector={<AudienceSelectorEvent />}
        onSubmit={(data) => {
          create.mutate(
            { ...data, scope: "event", targetType: "event", targetFilter: { eventId } },
            {
              onSuccess: (broadcast) =>
                router.push(`/events/${eventId}/broadcasts/${broadcast.id}`),
            },
          );
        }}
        isSubmitting={create.isPending}
      />
    </div>
  );
}
