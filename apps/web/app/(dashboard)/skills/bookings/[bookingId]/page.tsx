"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSkillMessages, useSendSkillMessage } from "@/hooks/skills/use-skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";

export default function SkillMessagesPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { data: messages, isLoading } = useSkillMessages(bookingId);
  const sendMessage = useSendSkillMessage();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!body.trim()) return;
    sendMessage.mutate({ bookingId, body: body.trim() }, { onSuccess: () => setBody("") });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center gap-4 border-b pb-4">
        <Link href="/skills">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">取引メッセージ</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
        ) : !messages?.length ? (
          <div className="py-12 text-center text-muted-foreground">メッセージがありません</div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {m.sender.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    {m.sender.name} ・ {new Date(m.createdAt).toLocaleString("ja-JP")}
                  </div>
                  <div className="mt-1 rounded-lg bg-muted p-3 text-sm">{m.body}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t pt-4">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="メッセージを入力..."
        />
        <Button onClick={handleSend} disabled={!body.trim() || sendMessage.isPending} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
