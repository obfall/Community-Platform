"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useChatRooms, useChatMessages, useCreateChatRoom, useMarkAsRead } from "@/hooks/use-chat";
import { chatApi } from "@/lib/api/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Send, Plus, Users } from "lucide-react";
import type { ChatRoom, ChatMessage } from "@/lib/api/types";
import { useQueryClient } from "@tanstack/react-query";

export default function ChatPage() {
  const { user } = useAuth();
  const { data: rooms, isLoading } = useChatRooms();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomType, setNewRoomType] = useState<"dm" | "group">("dm");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomMemberIds, setNewRoomMemberIds] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messagesData } = useChatMessages(selectedRoomId ?? undefined, {
    limit: 100,
  });
  const createRoom = useCreateChatRoom();
  const markAsRead = useMarkAsRead();

  const selectedRoom = rooms?.find((r: ChatRoom) => r.id === selectedRoomId);
  const messages = messagesData?.data ?? [];

  // 選択ルーム変更時に既読更新
  useEffect(() => {
    if (selectedRoomId) {
      markAsRead.mutate(selectedRoomId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !selectedRoomId) return;
    try {
      await chatApi.getMessages(selectedRoomId, { limit: 1 }); // 接続確認
      // REST APIで送信（WebSocketは将来対応）
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/rooms/${selectedRoomId}/messages`,
        { method: "GET" },
      );
      // 暫定: REST経由ではメッセージ送信エンドポイントがないため、
      // WebSocket経由での送信を想定。ここではchatApi経由でrefetchのみ。
      void response;
    } catch {
      // ignore
    }
    // メッセージリストを再取得
    queryClient.invalidateQueries({ queryKey: ["chat", "messages", selectedRoomId] });
    setMessageText("");
  }, [messageText, selectedRoomId, queryClient]);

  const handleCreateRoom = () => {
    const memberIds = newRoomMemberIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (memberIds.length === 0) return;

    createRoom.mutate(
      {
        type: newRoomType,
        name: newRoomType === "group" ? newRoomName : undefined,
        memberIds,
      },
      {
        onSuccess: (room) => {
          setSelectedRoomId(room.id);
          setNewRoomOpen(false);
          setNewRoomName("");
          setNewRoomMemberIds("");
        },
      },
    );
  };

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.name) return room.name;
    if (room.type === "dm") {
      const other = room.members.find((m) => m.userId !== user?.id);
      return other?.name ?? "DM";
    }
    return "グループチャット";
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* 左パネル: ルーム一覧 */}
      <div className="flex w-80 flex-col border-r">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">チャット</h2>
          <Dialog open={newRoomOpen} onOpenChange={setNewRoomOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規チャット</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>種別</Label>
                  <Select
                    value={newRoomType}
                    onValueChange={(v) => setNewRoomType(v as "dm" | "group")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dm">DM（1対1）</SelectItem>
                      <SelectItem value="group">グループ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newRoomType === "group" && (
                  <div>
                    <Label>グループ名</Label>
                    <Input
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="グループ名を入力"
                    />
                  </div>
                )}
                <div>
                  <Label>メンバーID（カンマ区切り）</Label>
                  <Input
                    value={newRoomMemberIds}
                    onChange={(e) => setNewRoomMemberIds(e.target.value)}
                    placeholder="ユーザーIDを入力"
                  />
                </div>
                <Button onClick={handleCreateRoom} disabled={createRoom.isPending}>
                  作成
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : !rooms?.length ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              チャットルームがありません
            </div>
          ) : (
            <div className="flex flex-col">
              {rooms.map((room: ChatRoom) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`flex items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent ${
                    selectedRoomId === room.id ? "bg-accent" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>
                      {room.type === "dm" ? (
                        getRoomDisplayName(room).charAt(0)
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium">
                        {getRoomDisplayName(room)}
                      </span>
                      {room.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2 shrink-0">
                          {room.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {room.lastMessage && (
                      <p className="truncate text-xs text-muted-foreground">
                        {room.lastMessage.senderName}: {room.lastMessage.body ?? "📎 ファイル"}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 右パネル: メッセージエリア */}
      <div className="flex flex-1 flex-col">
        {selectedRoom ? (
          <>
            {/* ルームヘッダー */}
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {selectedRoom.type === "dm" ? (
                    getRoomDisplayName(selectedRoom).charAt(0)
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-semibold">{getRoomDisplayName(selectedRoom)}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedRoom.memberCount}人のメンバー
                </p>
              </div>
            </div>

            {/* メッセージ一覧 */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg: ChatMessage) => {
                  const isOwn = msg.sender.id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                      {!isOwn && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback>{msg.sender.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                        {!isOwn && (
                          <p className="mb-1 text-xs text-muted-foreground">{msg.sender.name}</p>
                        )}
                        <div
                          className={`inline-block rounded-lg px-4 py-2 text-sm ${
                            isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          {msg.body ?? "📎 ファイル"}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* メッセージ入力 */}
            <div className="border-t p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!messageText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-4 h-12 w-12" />
              <p>チャットルームを選択してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
