"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

const ATTRIBUTE_TYPES = ["text", "number", "date", "select", "multi_select"] as const;

export function AttributesForm() {
  const t = useTranslations("settings.community");
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
          <CardTitle>{t("attributes.title")}</CardTitle>
          <CardDescription>{t("attributes.description")}</CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("attributes.addNew")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-12 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : !attributes?.length ? (
          <p className="py-12 text-center text-muted-foreground">{t("attributes.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("attributes.columns.name")}</TableHead>
                <TableHead>{t("attributes.columns.type")}</TableHead>
                <TableHead>{t("attributes.columns.permission")}</TableHead>
                <TableHead>{t("attributes.columns.options")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((attr) => (
                <TableRow key={attr.id}>
                  <TableCell className="font-medium">{attr.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {(ATTRIBUTE_TYPES as readonly string[]).includes(attr.type)
                        ? t(`attributes.types.${attr.type}`)
                        : attr.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={attr.isSelfEditable ? "default" : "outline"}>
                      {attr.isSelfEditable
                        ? t("attributes.selfEditable")
                        : t("attributes.adminOnly")}
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
                            <AlertDialogTitle>
                              {t("attributes.deleteDialog.title")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("attributes.deleteDialog.description", { name: attr.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAttr.mutate(attr.id)}>
                              {t("attributes.deleteDialog.confirm")}
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
              <DialogTitle>
                {editingAttr ? t("attributes.editTitle") : t("attributes.createTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("attributes.nameLabel")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("attributes.namePlaceholder")}
                />
              </div>
              {!editingAttr && (
                <div>
                  <Label>{t("attributes.typeLabel")}</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTRIBUTE_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {t(`attributes.types.${v}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(type === "select" || type === "multi_select") && (
                <div>
                  <Label>{t("attributes.optionsLabel")}</Label>
                  <Input
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder={t("attributes.optionsPlaceholder")}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isSelfEditable}
                  onCheckedChange={(v) => setIsSelfEditable(v === true)}
                />
                {t("attributes.selfEditableCheckbox")}
              </label>
              <Button
                onClick={handleSave}
                disabled={!name || createAttr.isPending || updateAttr.isPending}
                className="w-full"
              >
                {editingAttr ? t("attributes.update") : t("attributes.create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
