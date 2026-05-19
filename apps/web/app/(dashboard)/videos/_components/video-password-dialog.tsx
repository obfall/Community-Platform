"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { VIDEO_PASSWORD_LENGTH } from "@community-platform/shared";

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
  const t = useTranslations("videos.passwordDialog");
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
        // エラートーストはグローバル任せ。入力欄のクリアだけはこの場で行う。
        onError: () => setPassword(""),
      },
    );
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("label")}</Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern={`\\d{${VIDEO_PASSWORD_LENGTH}}`}
                maxLength={VIDEO_PASSWORD_LENGTH}
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, "").slice(0, VIDEO_PASSWORD_LENGTH))
                }
                placeholder={t("placeholder")}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={password.length !== VIDEO_PASSWORD_LENGTH || verify.isPending}
            >
              {verify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
