"use client";

import { useState } from "react";
import { useVenues, useCreateVenue } from "@/hooks/venues/use-venues";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { VENUE_TYPE_OPTIONS } from "@/lib/constants/venue-types";

const NONE_VALUE = "__none__";

interface VenuePickerProps {
  value?: string;
  onChange: (venue: { id: string; name: string; address: string | null } | null) => void;
  disabled?: boolean;
}

export function VenuePicker({ value, onChange, disabled }: VenuePickerProps) {
  const { data: venues, isLoading } = useVenues();
  const createVenue = useCreateVenue();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [venueTypes, setVenueTypes] = useState<string[]>([]);

  const handleSelect = (id: string) => {
    if (id === NONE_VALUE) {
      onChange(null);
      return;
    }
    const v = venues?.find((vv) => vv.id === id);
    if (v) onChange({ id: v.id, name: v.name, address: v.address });
  };

  const resetForm = () => {
    setName("");
    setAddress("");
    setVenueTypes([]);
  };

  const handleCreate = () => {
    createVenue.mutate(
      {
        name,
        address: address || undefined,
        venueTypes,
        publishStatus: "published",
      },
      {
        onSuccess: (created) => {
          const v = created as { id: string; name: string; address: string | null };
          onChange({ id: v.id, name: v.name, address: v.address });
          setOpen(false);
          resetForm();
        },
      },
    );
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value ?? NONE_VALUE} onValueChange={handleSelect} disabled={disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "読み込み中..." : "施設を選択"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>選択しない</SelectItem>
            {venues?.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" />
          新規作成
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>施設を新規登録</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>施設名</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="施設名"
                maxLength={200}
              />
            </div>
            <div>
              <Label>住所</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="住所（任意）"
              />
            </div>
            <div>
              <Label>種別（複数選択可）</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {VENUE_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={venueTypes.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        setVenueTypes((prev) =>
                          checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value),
                        );
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!name || createVenue.isPending}
            >
              {createVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登録して選択
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
