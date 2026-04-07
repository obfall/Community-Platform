"use client";

import { useRef, useState } from "react";
import { filesApi } from "@/lib/api/files";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, FileIcon } from "lucide-react";
import { toast } from "sonner";

export interface UploadedFileItem {
  fileId: string;
  url: string | null;
  name: string;
  contentType: string;
}

interface Props {
  value: UploadedFileItem[];
  onChange: (files: UploadedFileItem[]) => void;
  fileCategory?: string;
  maxSizeMB?: number;
  accept?: string;
}

function isImage(contentType: string) {
  return contentType.startsWith("image/");
}

export function FileUploadList({
  value,
  onChange,
  fileCategory = "document",
  maxSizeMB = 20,
  accept,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxBytes = maxSizeMB * 1024 * 1024;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: UploadedFileItem[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxBytes) {
          toast.error(`${file.name} は ${maxSizeMB}MB を超えています`);
          continue;
        }
        const category = isImage(file.type) ? "image" : fileCategory;
        try {
          const result = await filesApi.upload(file, category, true);
          uploaded.push({
            fileId: result.id,
            url: result.publicUrl,
            name: result.originalName,
            contentType: result.contentType,
          });
        } catch (err) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "アップロードに失敗しました";
          toast.error(`${file.name}: ${msg}`);
        }
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, idx) => (
            <div
              key={file.fileId}
              className="flex items-center gap-3 rounded-md border p-2 text-sm"
            >
              {isImage(file.contentType) && file.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              {file.url ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate hover:underline"
                >
                  {file.name}
                </a>
              ) : (
                <span className="flex-1 truncate">{file.name}</span>
              )}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="削除"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
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
        ファイルを追加
      </Button>
      <p className="text-xs text-muted-foreground">最大 {maxSizeMB}MB / ファイル</p>
    </div>
  );
}
