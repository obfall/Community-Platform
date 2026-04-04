"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  disabled?: boolean;
}

export function LikeButton({ liked, count, onToggle, disabled }: LikeButtonProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onToggle} disabled={disabled} className="gap-1.5">
      <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
      <span className="text-xs">{count}</span>
    </Button>
  );
}
