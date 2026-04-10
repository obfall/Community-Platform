"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useMemos,
  useMemoCategories,
  useCreateMemoCategory,
  useDeleteMemoCategory,
} from "@/hooks/memo/use-memo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, StickyNote, Trash2, FolderPlus } from "lucide-react";

export default function MemoPage() {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const { data: memos, isLoading } = useMemos({ categoryId, search: searchQuery || undefined });
  const { data: categories } = useMemoCategories();
  const createCategory = useCreateMemoCategory();
  const deleteCategory = useDeleteMemoCategory();

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategory.mutate(newCategoryName.trim(), {
      onSuccess: () => {
        setNewCategoryName("");
        setCatDialogOpen(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メモ</h1>
        <Link href="/memo/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            作成
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">カテゴリ</h2>
            <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>カテゴリ追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Label>カテゴリ名</Label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName || createCategory.isPending}
                  >
                    追加
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <button
            onClick={() => setCategoryId(undefined)}
            className={`w-full rounded px-3 py-2 text-left text-sm ${
              !categoryId ? "bg-muted font-semibold" : "hover:bg-muted/50"
            }`}
          >
            すべて
          </button>
          {(categories ?? []).map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                categoryId === c.id ? "bg-muted font-semibold" : "hover:bg-muted/50"
              }`}
            >
              <button onClick={() => setCategoryId(c.id)} className="flex-1 text-left">
                {c.name}
              </button>
              <button
                onClick={() => {
                  if (confirm("このカテゴリを削除しますか?")) deleteCategory.mutate(c.id);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </aside>

        <div className="space-y-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearchQuery(search)}
            placeholder="メモを検索..."
            className="max-w-xs"
          />

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
          ) : (memos ?? []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <StickyNote className="mx-auto mb-4 h-12 w-12" />
              <p>メモがありません</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(memos ?? []).map((m) => (
                <Link key={m.id} href={`/memo/${m.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <h3 className="line-clamp-1 text-sm font-semibold">{m.title}</h3>
                      {m.body && (
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{m.body}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                        <span>{m.category?.name ?? "未分類"}</span>
                        <span>{new Date(m.updatedAt).toLocaleDateString("ja-JP")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
