"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useBannedWords,
  useCreateBannedWord,
  useDeleteBannedWord,
} from "@/hooks/moderation/use-moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function BannedWordsPage() {
  const { data, isLoading } = useBannedWords();
  const items = data ?? [];

  const createBannedWord = useCreateBannedWord();
  const deleteBannedWord = useDeleteBannedWord();

  const [word, setWord] = useState("");
  const [matchType, setMatchType] = useState("exact");
  const [action, setAction] = useState("flag");
  const [replacement, setReplacement] = useState("");

  const handleAdd = () => {
    createBannedWord.mutate(
      {
        word,
        matchType,
        action,
        replacement: replacement || undefined,
      },
      {
        onSuccess: () => {
          setWord("");
          setReplacement("");
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/moderation">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">禁止ワード管理</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>追加</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>ワード</Label>
              <Input value={word} onChange={(e) => setWord(e.target.value)} maxLength={100} />
            </div>
            <div>
              <Label>マッチ方式</Label>
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">完全一致</SelectItem>
                  <SelectItem value="partial">部分一致</SelectItem>
                  <SelectItem value="regex">正規表現</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>アクション</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flag">フラグ</SelectItem>
                  <SelectItem value="block">ブロック</SelectItem>
                  <SelectItem value="replace">置換</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>置換文字列</Label>
              <Input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={!word || createBannedWord.isPending}>
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">禁止ワードはありません</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ワード</TableHead>
                <TableHead>マッチ</TableHead>
                <TableHead>アクション</TableHead>
                <TableHead>置換</TableHead>
                <TableHead>有効</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.word}</TableCell>
                  <TableCell>{b.matchType}</TableCell>
                  <TableCell>{b.action}</TableCell>
                  <TableCell>{b.replacement ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={b.isActive ? "default" : "secondary"}>
                      {b.isActive ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("削除しますか?")) deleteBannedWord.mutate(b.id);
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
