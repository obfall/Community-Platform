"use client";

import Link from "next/link";
import { useOrientationPages, useDeletePage } from "@/hooks/use-orientation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";

export default function OrientationManagePage() {
  const { data, isLoading } = useOrientationPages();
  const deletePage = useDeletePage();
  const pages = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/orientation">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">オリエンテーション管理</h1>
        </div>
        <Link href="/orientation/manage/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            ページ作成
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
        ) : pages.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">ページがありません</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>順序</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>公開</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.sortOrder}</TableCell>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>
                    <Badge variant={p.isPublished ? "default" : "secondary"}>
                      {p.isPublished ? "公開" : "下書き"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/orientation/manage/${p.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("削除しますか?")) deletePage.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
