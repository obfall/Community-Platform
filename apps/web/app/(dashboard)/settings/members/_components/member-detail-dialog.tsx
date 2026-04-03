"use client";

import { useUser } from "@/hooks/use-users";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>メンバー詳細</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="py-8 text-center text-muted-foreground">読み込み中...</p>}

        {user && (
          <div className="space-y-6">
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

            <Separator />

            {/* プロフィール */}
            {user.profile && (
              <Section title="プロフィール">
                <InfoRow label="名前（カナ）" value={user.profile.nameKana} />
                <InfoRow label="自己紹介" value={user.profile.bio} />
                <InfoRow label="電話番号" value={user.profile.phone} />
                <InfoRow
                  label="誕生日"
                  value={
                    user.profile.birthday
                      ? new Date(user.profile.birthday).toLocaleDateString("ja-JP")
                      : null
                  }
                />
                <InfoRow label="ウェブサイト" value={user.profile.website} />
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

            {/* 言語 */}
            {user.languages.length > 0 && (
              <Section title="言語">
                <div className="flex flex-wrap gap-2">
                  {user.languages.map((lang) => (
                    <Badge key={lang.id} variant="outline">
                      {lang.languageCode}
                      {lang.proficiency && ` (${lang.proficiency})`}
                    </Badge>
                  ))}
                </div>
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

            <Separator />

            <p className="text-xs text-muted-foreground">
              登録日: {new Date(user.createdAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
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
