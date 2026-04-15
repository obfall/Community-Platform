"use client";

import { useState } from "react";
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
          <DialogTitle>予約する</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>スペース</Label>
            <Select value={effectiveSpaceId} onValueChange={setSpaceId}>
              <SelectTrigger>
                <SelectValue placeholder="スペースを選択" />
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
            <Label>タイトル（任意）</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="予約のタイトル"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>開始日時</Label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div>
              <Label>終了日時</Label>
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
            予約する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
