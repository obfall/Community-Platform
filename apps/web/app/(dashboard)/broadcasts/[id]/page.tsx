"use client";

import { use } from "react";
import { useBroadcast, useSendBroadcast } from "@/hooks/broadcasts/use-broadcasts";
import { BroadcastDetail } from "@/components/broadcasts/broadcast-detail";

export default function BroadcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: broadcast, isLoading } = useBroadcast(id);
  const send = useSendBroadcast();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!broadcast) {
    return <div className="py-12 text-center text-muted-foreground">配信が見つかりません</div>;
  }

  return (
    <BroadcastDetail
      broadcast={broadcast}
      backHref="/broadcasts"
      onSend={() => send.mutate(id)}
      isSending={send.isPending}
    />
  );
}
