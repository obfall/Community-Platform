"use client";

import { useState } from "react";
import {
  useMemberAttributes,
  useCreateMemberAttribute,
  useUpdateMemberAttribute,
  useDeleteMemberAttribute,
} from "@/hooks/use-member-attributes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { MemberAttribute } from "@/lib/api/types";

const TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  number: "数値",
  date: "日付",
  select: "単一選択",
  multi_select: "複数選択",
};

export default function MemberAttributesPage() {
  const { data: attributes, isLoading } = useMemberAttributes();
  const createAttr = useCreateMemberAttribute();
  const updateAttr = useUpdateMemberAttribute();
  const deleteAttr = useDeleteMemberAttribute();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<MemberAttribute | null>(null);

  // フォーム state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<string>("text");
  const [optionsText, setOptionsText] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const openCreate = () => {
    setEditingAttr(null);
    setName("");
    setSlug("");
    setType("text");
    setOptionsText("");
    setIsRequired(false);
    setDialogOpen(true);
  };

  const openEdit = (attr: MemberAttribute) => {
    setEditingAttr(attr);
    setName(attr.name);
    setSlug(attr.slug);
    setType(attr.type);
    setOptionsText(attr.options?.join(", ") ?? "");
    setIsRequired(attr.isRequired);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const options =
      type === "select" || type === "multi_select"
        ? optionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (editingAttr) {
      updateAttr.mutate(
        { id: editingAttr.id, data: { name, options, isRequired } },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createAttr.mutate(
        {
          name,
          slug,
          type: type as "text" | "number" | "date" | "select" | "multi_select",
          options,
          isRequired,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">カスタム属性管理</h1>
          <p className="mt-1 text-muted-foreground">メンバーに割り当てるカスタム属性を管理します</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新規追加
        </Button>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">読み込み中...</p>
      ) : !attributes?.length ? (
        <p className="py-12 text-center text-muted-foreground">カスタム属性がありません</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>属性名</TableHead>
              <TableHead>スラッグ</TableHead>
              <TableHead>タイプ</TableHead>
              <TableHead>必須</TableHead>
              <TableHead>選択肢</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {attributes.map((attr) => (
              <TableRow key={attr.id}>
                <TableCell className="font-medium">{attr.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{attr.slug}</TableCell>
                <TableCell>
                  <Badge variant="outline">{TYPE_LABELS[attr.type] ?? attr.type}</Badge>
                </TableCell>
                <TableCell>{attr.isRequired ? "必須" : "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {(attr.options as string[] | null)?.join(", ") ?? "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(attr)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>属性を削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            「{attr.name}」を削除すると、全メンバーのこの属性値も削除されます。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteAttr.mutate(attr.id)}>
                            削除する
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* 作成/編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAttr ? "属性を編集" : "新規属性"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>属性名</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 入会動機"
              />
            </div>
            {!editingAttr && (
              <>
                <div>
                  <Label>スラッグ（変更不可）</Label>
                  <Input
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    placeholder="例: join_reason"
                  />
                </div>
                <div>
                  <Label>タイプ（変更不可）</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">テキスト</SelectItem>
                      <SelectItem value="number">数値</SelectItem>
                      <SelectItem value="date">日付</SelectItem>
                      <SelectItem value="select">単一選択</SelectItem>
                      <SelectItem value="multi_select">複数選択</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {(type === "select" || type === "multi_select") && (
              <div>
                <Label>選択肢（カンマ区切り）</Label>
                <Input
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="例: 初級, 中級, 上級"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isRequired} onCheckedChange={(v) => setIsRequired(v === true)} />
              必須にする
            </label>
            <Button
              onClick={handleSave}
              disabled={
                !name || (!editingAttr && !slug) || createAttr.isPending || updateAttr.isPending
              }
              className="w-full"
            >
              {editingAttr ? "更新" : "作成"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
