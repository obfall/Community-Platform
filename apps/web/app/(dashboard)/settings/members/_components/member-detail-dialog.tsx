"use client";

import { useState } from "react";
import {
  useUser,
  useUpdateUserRole,
  useUpdateUserStatus,
  useUserAttributes,
  useSetUserAttributes,
  useForcePasswordReset,
  useUpdateUserEmail,
} from "@/hooks/settings/use-members";
import { useAuth } from "@/hooks/auth/use-auth";
import type { UserDetail } from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserAttributeValue } from "@/lib/api/types";

const ROLE_LABELS: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  moderator: "モデレーター",
  member: "メンバー",
};

const GENDER_LABELS: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  prefer_not_to_say: "回答しない",
};

interface MemberDetailDialogProps {
  userId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailDialog({ userId, open, onOpenChange }: MemberDetailDialogProps) {
  const { data: user, isLoading } = useUser(userId);

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>メンバー詳細</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="py-8 text-center text-muted-foreground">読み込み中...</p>}

        {user && (
          <div className="space-y-4">
            {/* 基本情報 */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-bold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-1 flex gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                </div>
              </div>
            </div>

            <MemberActions key={user.id} user={user} />

            <Separator />

            <Tabs defaultValue="detail">
              <TabsList>
                <TabsTrigger value="detail">詳細</TabsTrigger>
                <TabsTrigger value="attributes">カスタム属性</TabsTrigger>
              </TabsList>

              <TabsContent value="detail" className="space-y-6 pt-2">
                {/* プロフィール */}
                {user.profile && (
                  <Section title="プロフィール">
                    <InfoRow label="名前（カナ）" value={user.profile.nameKana} />
                    <InfoRow label="電話番号" value={user.profile.phone} />
                    <InfoRow
                      label="誕生日"
                      value={
                        user.profile.birthday
                          ? new Date(user.profile.birthday).toLocaleDateString("ja-JP")
                          : null
                      }
                    />
                    <InfoRow
                      label="性別"
                      value={
                        user.profile.gender
                          ? (GENDER_LABELS[user.profile.gender] ?? user.profile.gender)
                          : null
                      }
                    />
                    <InfoRow label="職業" value={user.profile.occupation} />
                    <InfoRow label="出身国" value={user.profile.countryOfOrigin} />
                  </Section>
                )}

                {/* 公開情報 */}
                {user.publicInfo && (
                  <Section title="公開情報">
                    <InfoRow label="ニックネーム" value={user.publicInfo.nickname} />
                    <InfoRow label="専門分野" value={user.publicInfo.specialty} />
                    <InfoRow label="都道府県" value={user.publicInfo.prefecture} />
                    <InfoRow label="市区町村" value={user.publicInfo.city} />
                    <InfoRow label="イベント役割" value={user.publicInfo.eventRole} />
                  </Section>
                )}

                {/* 所属 */}
                {user.affiliations.length > 0 && (
                  <Section title="所属">
                    {user.affiliations.map((aff) => (
                      <div key={aff.id} className="text-sm">
                        <p className="font-medium">{aff.organizationName}</p>
                        {aff.title && <p className="text-muted-foreground">{aff.title}</p>}
                      </div>
                    ))}
                  </Section>
                )}

                <p className="text-xs text-muted-foreground">
                  登録日: {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                </p>
              </TabsContent>

              <TabsContent value="attributes" className="pt-2">
                <AttributesForm userId={user.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberActions({ user }: { user: UserDetail }) {
  const { user: currentUser } = useAuth();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const forceReset = useForcePasswordReset();
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const isDirty = role !== user.role || status !== user.status;
  const isSaving = updateRole.isPending || updateStatus.isPending;

  const isSelf = currentUser?.id === user.id;
  const isOwnerTargetingAdmin = currentUser?.role === "owner" && user.role === "admin";
  const canAdminAction = !isSelf && !isOwnerTargetingAdmin;

  const handleSave = async () => {
    const tasks: Promise<unknown>[] = [];
    if (role !== user.role) tasks.push(updateRole.mutateAsync({ id: user.id, role }));
    if (status !== user.status) tasks.push(updateStatus.mutateAsync({ id: user.id, status }));
    await Promise.all(tasks);
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">ロール</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">オーナー</SelectItem>
              <SelectItem value="admin">管理者</SelectItem>
              <SelectItem value="moderator">モデレーター</SelectItem>
              <SelectItem value="member">メンバー</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">ステータス</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">有効</SelectItem>
              <SelectItem value="suspended">停止</SelectItem>
              <SelectItem value="withdrawn">退会</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" disabled={!isDirty || isSaving} onClick={handleSave} className="ml-auto">
          保存
        </Button>
      </div>

      {canAdminAction && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={forceReset.isPending}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />
                パスワード強制リセット
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>パスワードを強制リセットしますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  {user.name} さん（{user.email}）にパスワードリセットメールを送信します。
                  既存のリセットリンクは無効になります。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => forceReset.mutate(user.id)}>
                  送信する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button size="sm" variant="outline" onClick={() => setEmailDialogOpen(true)}>
            <Mail className="mr-2 h-3.5 w-3.5" />
            メールアドレス変更
          </Button>

          <EmailChangeDialog user={user} open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
        </div>
      )}
    </div>
  );
}

function EmailChangeDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateEmail = useUpdateUserEmail();
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const reset = () => {
    setEmail("");
    setConfirmEmail("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailPattern.test(email);
  const isMatch = email === confirmEmail;
  const isSame = email === user.email;
  const canSubmit = isEmailValid && isMatch && !isSame && !updateEmail.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    updateEmail.mutate(
      { id: user.id, email },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>メールアドレス変更</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <p className="text-muted-foreground">現在のメールアドレス</p>
            <p className="font-medium">{user.email}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-email">新しいメールアドレス</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new@example.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirm-email">確認用</Label>
            <Input
              id="confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="new@example.com"
            />
            {confirmEmail && !isMatch && (
              <p className="text-xs text-destructive">メールアドレスが一致しません</p>
            )}
          </div>

          {isSame && email && (
            <p className="text-xs text-destructive">現在のメールアドレスと同じです</p>
          )}

          <p className="text-xs text-muted-foreground">
            変更後、対象ユーザーのセッションは全て無効化されます。
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            変更する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttributesForm({ userId }: { userId: string }) {
  const { data: attributes, isLoading } = useUserAttributes(userId);
  const setAttributes = useSetUserAttributes();
  const [values, setValues] = useState<Record<string, string | null>>({});
  const [initialized, setInitialized] = useState(false);

  // 初期値を設定
  if (attributes && !initialized) {
    const initial: Record<string, string | null> = {};
    for (const attr of attributes) {
      initial[attr.attributeId] = attr.value;
    }
    setValues(initial);
    setInitialized(true);
  }

  if (isLoading)
    return <p className="py-4 text-center text-sm text-muted-foreground">読み込み中...</p>;
  if (!attributes?.length)
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        カスタム属性が定義されていません
      </p>
    );

  const handleSave = () => {
    const items = Object.entries(values).map(([attributeId, value]) => ({
      attributeId,
      value: value || null,
    }));
    setAttributes.mutate({ userId, values: items });
  };

  return (
    <div className="space-y-4">
      {attributes.map((attr: UserAttributeValue) => (
        <div key={attr.attributeId} className="space-y-1">
          <label className="text-sm font-medium">{attr.attributeName}</label>
          <AttributeField
            attr={attr}
            value={values[attr.attributeId] ?? ""}
            onChange={(v) => setValues((prev) => ({ ...prev, [attr.attributeId]: v }))}
          />
        </div>
      ))}
      <Button onClick={handleSave} disabled={setAttributes.isPending} className="w-full">
        保存
      </Button>
    </div>
  );
}

function AttributeField({
  attr,
  value,
  onChange,
}: {
  attr: UserAttributeValue;
  value: string;
  onChange: (v: string) => void;
}) {
  switch (attr.type) {
    case "text":
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "date":
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="選択..." />
          </SelectTrigger>
          <SelectContent>
            {attr.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multi_select": {
      const selected: string[] = value ? JSON.parse(value) : [];
      const toggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt];
        onChange(JSON.stringify(next));
      };
      return (
        <div className="flex flex-wrap gap-3">
          {attr.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
