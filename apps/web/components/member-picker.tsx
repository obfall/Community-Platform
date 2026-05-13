"use client";

import { useState } from "react";
import { useMembers } from "@/hooks/members/use-members";
import { usersApi } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchInput } from "@/components/search-input";
import { X, UserPlus, Loader2 } from "lucide-react";

/**
 * onChange に渡される値の形。defaultTitle は primary affiliation から自動構築した
 * 肩書文字列で、呼び出し側のフォームで「肩書」フィールドの初期値として活用できる。
 */
export interface MemberPickerValue {
  id: string;
  name: string;
  avatarUrl: string | null;
  defaultTitle?: string;
}

interface MemberPickerProps {
  value?: { id: string; name: string; avatarUrl: string | null } | null;
  onChange: (member: MemberPickerValue | null) => void;
  disabled?: boolean;
}

/**
 * メンバー検索 picker。ダイアログで検索 + 一覧から選択。
 *
 * - value: 現在選択中のメンバー（null なら未選択）
 * - 選択するとアバター + 名前ボタン表示、× で解除
 * - 未選択時は「メンバーを選択（任意）」ボタン
 */
export function MemberPicker({ value, onChange, disabled }: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const { data } = useMembers({ search: search || undefined, limit: 20 });
  const members = data?.data ?? [];

  /**
   * メンバー選択時に user detail を取得し、primary affiliation から defaultTitle を構築する。
   * - affiliations[0] が「組織名」「肩書」を持っていれば `${organizationName} ${title}` で結合
   * - title が無い場合は `${organizationName}` のみ
   * - affiliations が空 / 取得失敗時は defaultTitle 無しでフォールバック
   */
  const handlePick = async (m: { id: string; name: string; avatarUrl: string | null }) => {
    setPickingId(m.id);
    try {
      const detail = await usersApi.getUser(m.id);
      const primary = detail.affiliations[0];
      const defaultTitle = primary
        ? primary.title
          ? `${primary.organizationName} ${primary.title}`
          : primary.organizationName
        : undefined;
      onChange({ id: m.id, name: m.name, avatarUrl: m.avatarUrl, defaultTitle });
    } catch {
      // detail 取得失敗時は基本情報のみで確定（UX 上のフォールバック）
      onChange({ id: m.id, name: m.name, avatarUrl: m.avatarUrl });
    } finally {
      setPickingId(null);
      setOpen(false);
      setSearch("");
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
        <Avatar className="h-6 w-6">
          {value.avatarUrl && <AvatarImage src={value.avatarUrl} alt={value.name} />}
          <AvatarFallback className="text-xs">{value.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="flex-1 text-sm">{value.name}</span>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onChange(null)}
            aria-label="メンバー選択を解除"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full justify-start text-muted-foreground"
      >
        <UserPlus className="mr-2 h-3 w-3" />
        メンバーを選択（任意）
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを選択</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              onSubmit={setSearch}
              placeholder="名前で検索..."
            />
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {members.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  メンバーが見つかりません
                </p>
              ) : (
                members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={pickingId !== null}
                    onClick={() => handlePick(m)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted disabled:opacity-50"
                  >
                    <Avatar className="h-8 w-8">
                      {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
                      <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm">{m.name}</span>
                    {pickingId === m.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
