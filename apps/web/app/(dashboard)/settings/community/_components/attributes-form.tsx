"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useMemberAttributes,
  useCreateMemberAttribute,
  useUpdateMemberAttribute,
  useDeleteMemberAttribute,
} from "@/hooks/settings/use-member-attributes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemberAttribute } from "@/lib/api/types";

const TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  number: "数値",
  date: "日付",
  select: "単一選択",
  multi_select: "複数選択",
};

export function AttributesForm() {
  const { data: attributes, isLoading } = useMemberAttributes();
  const createAttr = useCreateMemberAttribute();
  const updateAttr = useUpdateMemberAttribute();
  const deleteAttr = useDeleteMemberAttribute();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<MemberAttribute | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("text");
  const [optionsText, setOptionsText] = useState("");
  const [isSelfEditable, setIsSelfEditable] = useState(false);

  const openCreate = () => {
    setEditingAttr(null);
    setName("");
    setType("text");
    setOptionsText("");
    setIsSelfEditable(false);
    setDialogOpen(true);
  };

  const openEdit = (attr: MemberAttribute) => {
    setEditingAttr(attr);
    setName(attr.name);
    setType(attr.type);
    setOptionsText(attr.options?.join(", ") ?? "");
    setIsSelfEditable(attr.isSelfEditable);
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
        { id: editingAttr.id, data: { name, options, isSelfEditable } },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createAttr.mutate(
        {
          name,
          type: type as "text" | "number" | "date" | "select" | "multi_select",
          options,
          isSelfEditable,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>カスタム属性</CardTitle>
          <CardDescription>メンバーに割り当てるコミュニティ独自の項目を管理します</CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新規追加
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-12 text-center text-muted-foreground">読み込み中...</p>
        ) : !attributes?.length ? (
          <p className="py-12 text-center text-muted-foreground">カスタム属性がありません</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>属性名</TableHead>
                <TableHead>タイプ</TableHead>
                <TableHead>編集権限</TableHead>
                <TableHead>選択肢</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((attr) => (
                <TableRow key={attr.id}>
                  <TableCell className="font-medium">{attr.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[attr.type] ?? attr.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={attr.isSelfEditable ? "default" : "outline"}>
                      {attr.isSelfEditable ? "本人編集可" : "運営のみ"}
                    </Badge>
                  </TableCell>
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
                <Checkbox
                  checked={isSelfEditable}
                  onCheckedChange={(v) => setIsSelfEditable(v === true)}
                />
                メンバー自身も編集可
              </label>
              <Button
                onClick={handleSave}
                disabled={!name || createAttr.isPending || updateAttr.isPending}
                className="w-full"
              >
                {editingAttr ? "更新" : "作成"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
