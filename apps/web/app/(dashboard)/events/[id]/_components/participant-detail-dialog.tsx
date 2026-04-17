"use client";

import { useParticipantDetail } from "@/hooks/events/use-events";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Props {
  eventId: string;
  participantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GENDER_LABELS: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  prefer_not_to_say: "回答しない",
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}

export function ParticipantDetailDialog({ eventId, participantId, open, onOpenChange }: Props) {
  const { data: detail, isLoading } = useParticipantDetail(
    open ? eventId : undefined,
    open ? (participantId ?? undefined) : undefined,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>申込者情報</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : !detail ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            データが見つかりません
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <InfoRow label="メール" value={detail.applicantEmail} />
              <InfoRow label="氏名" value={detail.applicantName} />
              <InfoRow label="ふりがな" value={detail.applicantNameKana} />
              <InfoRow label="所属" value={detail.applicantAffiliation} />
              <InfoRow
                label="性別"
                value={
                  detail.applicantGender
                    ? (GENDER_LABELS[detail.applicantGender] ?? detail.applicantGender)
                    : null
                }
              />
              <InfoRow
                label="年齢"
                value={detail.applicantAge != null ? `${detail.applicantAge}歳` : null}
              />
              <InfoRow label="職業" value={detail.applicantOccupation} />
              <InfoRow label="国籍" value={detail.applicantNationality} />
            </div>

            {detail.answers.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 text-sm font-semibold">カスタム質問の回答</h3>
                  <div className="space-y-2">
                    {detail.answers.map((a) => (
                      <div key={a.questionId} className="text-sm">
                        <p className="font-medium text-muted-foreground">{a.label}</p>
                        <p className="whitespace-pre-wrap">
                          {Array.isArray(a.answer) ? a.answer.join(", ") : String(a.answer)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
