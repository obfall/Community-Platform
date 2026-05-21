"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCreateReservation } from "@/hooks/venues/use-venues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ReservationDialogProps {
  spaces: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReservationDialog({ spaces, open, onOpenChange }: ReservationDialogProps) {
  const t = useTranslations("venues.reservation");
  const createReservation = useCreateReservation();
  const [spaceId, setSpaceId] = useState("");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const effectiveSpaceId = spaceId || spaces[0]?.id || "";

  const reset = () => {
    setSpaceId("");
    setTitle("");
    setStartAt("");
    setEndAt("");
  };

  const handleSubmit = () => {
    createReservation.mutate(
      { spaceId: effectiveSpaceId, data: { title: title || undefined, startAt, endAt } },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("spaceLabel")}</Label>
            <Select value={effectiveSpaceId} onValueChange={setSpaceId}>
              <SelectTrigger>
                <SelectValue placeholder={t("spacePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("titleLabel")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("startAtLabel")}</Label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("endAtLabel")}</Label>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!effectiveSpaceId || !startAt || !endAt || createReservation.isPending}
          >
            {createReservation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
