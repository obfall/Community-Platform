"use client";

import { useState } from "react";
import Link from "next/link";
import { useMemos, useMemoCategories, useCreateMemoCategory } from "@/hooks/memo/use-memo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, StickyNote, FolderPlus } from "lucide-react";

export default function MemoPage() {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const { data: memos, isLoading } = useMemos({ categoryId, search: searchQuery || undefined });
  const { data: categories } = useMemoCategories();
  const createCategory = useCreateMemoCategory();

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
        <h2 className="text-xl font-bold">メモ</h2>
        <Link href="/profile/memo/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            作成
          </Button>
        </Link>
      </div>

      {/* 検索・フィルター */}
      <div className="flex items-center gap-4">
        <div className="flex flex-1 gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearchQuery(search)}
            placeholder="メモを検索..."
            className="max-w-sm"
          />
          <Button variant="outline" onClick={() => setSearchQuery(search)}>
            検索
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={categoryId ?? "all"}
            onValueChange={(v) => setCategoryId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
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
      </div>

      {/* メモ一覧 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : (memos ?? []).length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <StickyNote className="mx-auto mb-4 h-12 w-12" />
          <p>メモがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(memos ?? []).map((m) => (
            <Link key={m.id} href={`/profile/memo/${m.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {m.category && (
                          <Badge variant="outline" className="text-xs">
                            {m.category.name}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold">{m.title}</p>
                      {m.body && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.body}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(m.updatedAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
