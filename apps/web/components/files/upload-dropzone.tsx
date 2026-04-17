"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { filesApi } from "@/lib/api/files";
import { useRegisterFile } from "@/hooks/files/use-files-manager";

interface UploadDropzoneProps {
  folderId?: string;
  children: ReactNode;
}

export function UploadDropzone({ folderId, children }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const registerFile = useRegisterFile();

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setUploading(true);
      let successCount = 0;
      let failCount = 0;

      await Promise.all(
        fileArray.map(async (file) => {
          try {
            // カテゴリ自動判定
            let category = "general";
            if (file.type.startsWith("image/")) category = "image";
            else if (file.type.startsWith("video/")) category = "video";
            else if (
              file.type === "application/pdf" ||
              file.type.includes("document") ||
              file.type.includes("spreadsheet") ||
              file.type.includes("presentation")
            )
              category = "document";

            // 1. File エンティティにアップロード
            const uploaded = await filesApi.upload(file, category, true);

            // 2. スコープに登録
            await registerFile.mutateAsync({
              fileId: uploaded.id,
              parentFolderId: folderId,
            });

            successCount++;
          } catch {
            failCount++;
          }
        }),
      );

      setUploading(false);

      if (successCount > 0) {
        toast.success(`${successCount} 件のファイルをアップロードしました`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} 件のアップロードに失敗しました`);
      }
    },
    [folderId, registerFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      {children}

      {/* 非表示の file input（ツールバーのボタンから発火） */}
      <input
        ref={inputRef}
        id="file-upload-input"
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* ドラッグオーバー時のオーバーレイ */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-10 w-10" />
            <p className="font-medium">ファイルをドロップしてアップロード</p>
          </div>
        </div>
      )}

      {/* アップロード中のオーバーレイ */}
      {uploading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80">
          <p className="font-medium text-muted-foreground">アップロード中...</p>
        </div>
      )}
    </div>
  );
}
