"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ExportButton({ onClick, disabled }: ExportButtonProps) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled}>
      <Download className="mr-2 h-4 w-4" />
      CSV エクスポート
    </Button>
  );
}
