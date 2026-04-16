"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { useVerifyVideoPassword } from "@/hooks/videos/use-videos";
import { toast } from "sonner";

const STORAGE_KEY = "videosUnlocked";

function getUnlockedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function addUnlockedId(id: string) {
  const set = getUnlockedIds();
  set.add(id);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function isVideoUnlocked(id: string): boolean {
  return getUnlockedIds().has(id);
}

interface Props {
  videoId: string;
  onUnlocked: () => void;
}

export function VideoPasswordDialog({ videoId, onUnlocked }: Props) {
  const [password, setPassword] = useState("");
  const verify = useVerifyVideoPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify.mutate(
      { id: videoId, password },
      {
        onSuccess: () => {
          addUnlockedId(videoId);
          onUnlocked();
        },
        onError: () => {
          toast.error("パスワードが正しくありません");
          setPassword("");
        },
      },
    );
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            パスワードが必要です
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>4桁のパスワードを入力してください</Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="●●●●"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={password.length !== 4 || verify.isPending}>
              {verify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              確認
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
