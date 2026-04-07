"use client";

import { useState } from "react";
import {
  useProjectBoardTopic,
  useProjectBoardPosts,
  useCreateBoardPost,
  useCreateBoardReply,
  useToggleBoardLike,
} from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageSquare, Reply as ReplyIcon } from "lucide-react";

export function TopicDetail({ topicId, onBack }: { topicId: string; onBack: () => void }) {
  const { data: topic } = useProjectBoardTopic(topicId);
  const { data: postsData } = useProjectBoardPosts(topicId);
  const createPost = useCreateBoardPost();
  const createReply = useCreateBoardReply();
  const toggleLike = useToggleBoardLike();
  const [postBody, setPostBody] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  type Topic = {
    id: string;
    title: string;
    body: string;
    likeCount: number;
    commentCount: number;
    category: { name: string } | null;
    author: { name: string };
    createdAt: string;
  };
  type Post = {
    id: string;
    body: string;
    likeCount: number;
    author: { name: string };
    childComments: Array<{
      id: string;
      body: string;
      likeCount: number;
      author: { name: string };
      createdAt: string;
    }>;
    createdAt: string;
  };
  const t = topic as Topic | undefined;
  const posts = (postsData as { data: Post[] } | undefined)?.data ?? [];

  if (!t) return <p className="py-8 text-center text-sm text-muted-foreground">読み込み中...</p>;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← トピック一覧に戻る
      </button>
      {t.category && <Badge variant="secondary">{t.category.name}</Badge>}
      <h3 className="text-lg font-bold">{t.title}</h3>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t.author.name}</span>
        <span>{new Date(t.createdAt).toLocaleString("ja-JP")}</span>
      </div>
      <div className="whitespace-pre-wrap rounded border p-4 text-sm">{t.body}</div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => toggleLike.mutate({ targetType: "project_board_post", targetId: t.id })}
          className="flex items-center gap-1 hover:text-red-500"
        >
          <Heart className="h-4 w-4" />
          {t.likeCount}
        </button>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {t.commentCount}件の投稿
        </span>
      </div>
      <Separator />
      <div className="space-y-2">
        <Textarea
          value={postBody}
          onChange={(e) => setPostBody(e.target.value)}
          rows={3}
          placeholder="投稿を入力..."
        />
        <Button
          size="sm"
          onClick={() => {
            createPost.mutate({ topicId, body: postBody }, { onSuccess: () => setPostBody("") });
          }}
          disabled={!postBody.trim() || createPost.isPending}
        >
          投稿
        </Button>
      </div>
      <div className="space-y-4">
        {posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-3 py-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{p.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{p.author.name}</span>
                    <span className="text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        toggleLike.mutate({ targetType: "project_board_comment", targetId: p.id })
                      }
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      {p.likeCount > 0 && p.likeCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTarget(replyTarget === p.id ? null : p.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ReplyIcon className="h-3.5 w-3.5" />
                      返信
                    </button>
                  </div>
                </div>
              </div>
              {p.childComments.length > 0 && (
                <div className="ml-11 space-y-2 border-l-2 pl-4">
                  {p.childComments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {c.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{c.author.name}</span>
                          <span className="text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString("ja-JP", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                        <button
                          type="button"
                          onClick={() =>
                            toggleLike.mutate({
                              targetType: "project_board_comment",
                              targetId: c.id,
                            })
                          }
                          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500"
                        >
                          <Heart className="h-3 w-3" />
                          {c.likeCount > 0 && c.likeCount}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {replyTarget === p.id && (
                <div className="ml-11 flex gap-2 border-l-2 pl-4">
                  <Input
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && replyBody.trim()) {
                        createReply.mutate(
                          { postId: p.id, body: replyBody.trim() },
                          {
                            onSuccess: () => {
                              setReplyBody("");
                              setReplyTarget(null);
                            },
                          },
                        );
                      }
                    }}
                    placeholder="返信を入力..."
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      createReply.mutate(
                        { postId: p.id, body: replyBody.trim() },
                        {
                          onSuccess: () => {
                            setReplyBody("");
                            setReplyTarget(null);
                          },
                        },
                      );
                    }}
                    disabled={!replyBody.trim() || createReply.isPending}
                  >
                    返信
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setReplyTarget(null);
                      setReplyBody("");
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
