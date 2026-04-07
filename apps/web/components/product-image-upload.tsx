"use client";

import { useState, useRef } from "react";
import { filesApi } from "@/lib/api/files";
import { Button } from "@/components/ui/button";
import { Loader2, X, Upload } from "lucide-react";
import { toast } from "sonner";

export interface ProductImage {
  fileId: string;
  url: string;
}

interface Props {
  value: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}

export function ProductImageUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: ProductImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} は画像ではありません`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} は 10MB を超えています`);
          continue;
        }
        const result = await filesApi.upload(file, "image", true);
        if (result.publicUrl) {
          uploaded.push({ fileId: result.id, url: result.publicUrl });
        }
      }
      onChange([...value, ...uploaded]);
    } catch {
      toast.error("画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((img, idx) => (
          <div key={img.fileId} className="relative aspect-square overflow-hidden rounded border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            {idx === 0 && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                メイン
              </span>
            )}
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        画像を追加
      </Button>
      <p className="text-xs text-muted-foreground">
        最大10MB / JPG・PNG・WebP・GIF・SVG。最初の画像がメイン画像になります。
      </p>
    </div>
  );
}
