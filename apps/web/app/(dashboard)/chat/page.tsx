"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import { useChatRooms, useChatMessages, useCreateChatRoom, useMarkAsRead } from "@/hooks/use-chat";
import { usersApi } from "@/lib/api/users";
import { getAccessToken } from "@/lib/auth";
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
import { MessageCircle, Send, Plus, Users, X } from "lucide-react";
import type { ChatRoom, ChatMessage, UserListItem } from "@/lib/api/types";
import { useQueryClient } from "@tanstack/react-query";

export default function ChatPage() {
  const { user } = useAuth();
  const { data: rooms, isLoading } = useChatRooms();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomType, setNewRoomType] = useState<"dm" | "group">("dm");
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<UserListItem[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserListItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevRoomIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const { data: messagesData } = useChatMessages(selectedRoomId ?? undefined, {
    limit: 100,
  });
  const createRoom = useCreateChatRoom();
  const markAsRead = useMarkAsRead();

  const selectedRoom = rooms?.find((r: ChatRoom) => r.id === selectedRoomId);
  const historyMessages = messagesData?.data ?? [];
  // 履歴 + リアルタイムメッセージを結合（重複排除）
  const historyIds = new Set(historyMessages.map((m) => m.id));
  const newMessages = realtimeMessages.filter((m) => !historyIds.has(m.id));
  const messages = [...historyMessages, ...newMessages];

  // --- Socket.IO 接続 ---
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    // NEXT_PUBLIC_WS_URL が明示されていればそちらを使う。なければ API URL から導出
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/api\/?$/, "");
    const socket = io(`${wsUrl}/chat`, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      // connected
    });

    socket.on("chat:message", (msg: ChatMessage) => {
      setRealtimeMessages((prev) => [...prev, msg]);
      // ルーム一覧も更新
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    });

    socket.on("chat:typing", (data: { roomId: string; userName: string }) => {
      if (data.roomId === selectedRoomId) {
        setTypingUser(data.userName);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
      }
    });

    socket.on("chat:error", (data: { message: string }) => {
      console.error("Chat error:", data.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // --- ルーム切替時に join + リアルタイムメッセージリセット ---
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedRoomId) return;

    // 前のルームから離脱（サーバー側で自動管理されるが明示的に）
    if (prevRoomIdRef.current && prevRoomIdRef.current !== selectedRoomId) {
      setRealtimeMessages([]);
      setTypingUser(null);
    }

    socket.emit("chat:join", { roomId: selectedRoomId });
    prevRoomIdRef.current = selectedRoomId;

    markAsRead.mutate(selectedRoomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  // ユーザー検索（デバウンス）
  useEffect(() => {
    if (!memberSearch.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await usersApi.getUsers({ search: memberSearch, limit: 10 });
        const selectedIds = new Set(selectedMembers.map((m) => m.id));
        const filtered = res.data.filter((u) => u.id !== user?.id && !selectedIds.has(u.id));
        setSearchResults(filtered);
        setShowSuggestions(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [memberSearch, selectedMembers, user?.id]);

  const handleSelectMember = (member: UserListItem) => {
    setSelectedMembers((prev) => [...prev, member]);
    setMemberSearch("");
    setSearchResults([]);
    setShowSuggestions(false);
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // --- メッセージ送信（WebSocket経由） ---
  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !selectedRoomId || !socketRef.current) return;

    socketRef.current.emit("chat:message", {
      roomId: selectedRoomId,
      body: messageText.trim(),
      messageType: "text",
    });

    setMessageText("");
  }, [messageText, selectedRoomId]);

  // --- タイピング通知 ---
  const handleTyping = useCallback(() => {
    if (!selectedRoomId || !socketRef.current) return;
    socketRef.current.emit("chat:typing", { roomId: selectedRoomId });
  }, [selectedRoomId]);

  const handleCreateRoom = () => {
    if (selectedMembers.length === 0) return;

    createRoom.mutate(
      {
        type: newRoomType,
        name: newRoomType === "group" ? newRoomName : undefined,
        memberIds: selectedMembers.map((m) => m.id),
      },
      {
        onSuccess: (room) => {
          setSelectedRoomId(room.id);
          setNewRoomOpen(false);
          setNewRoomName("");
          setSelectedMembers([]);
          setMemberSearch("");
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
                  <Label>メンバー</Label>
                  {/* 選択済みメンバー */}
                  {selectedMembers.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {selectedMembers.map((m) => (
                        <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
                          {m.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id)}
                            className="ml-1 rounded-full hover:bg-muted-foreground/20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* 検索入力 */}
                  <div className="relative">
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="名前を入力して検索..."
                    />
                    {/* 候補リスト */}
                    {showSuggestions && searchResults.length > 0 && (
                      <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
                        {searchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectMember(u)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {u.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{u.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showSuggestions && memberSearch.trim() && searchResults.length === 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
                        該当するユーザーが見つかりません
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleCreateRoom}
                  disabled={createRoom.isPending || selectedMembers.length === 0}
                >
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

            {/* タイピングインジケーター + メッセージ入力 */}
            <div className="border-t">
              {typingUser && (
                <p className="px-4 pt-2 text-xs text-muted-foreground">{typingUser} が入力中...</p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2 p-4 pt-2"
              >
                <Input
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
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
