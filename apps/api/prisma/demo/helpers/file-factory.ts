import type { FileCategory, PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const R2_ENABLED = Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_BUCKET);

export interface CreateFileOptions {
  uploadedByUserId: string;
  category: FileCategory;
  originalName: string;
  contentType: string;
  localPath?: string;
  fallbackUrl?: string;
  isPublic?: boolean;
  imageWidth?: number;
  imageHeight?: number;
}

export interface CreatedFile {
  id: string;
  publicUrl: string | null;
}

export async function createFileRecord(
  prisma: PrismaClient,
  options: CreateFileOptions,
): Promise<CreatedFile> {
  const storageBucket = process.env.R2_BUCKET ?? "demo-local";
  const storageKey = `demo/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${options.originalName}`;

  let publicUrl = options.fallbackUrl ?? null;
  let fileSizeBytes = BigInt(0);

  if (options.localPath) {
    const absPath = path.isAbsolute(options.localPath)
      ? options.localPath
      : path.join(__dirname, "..", "..", "demo-assets", options.localPath);

    try {
      const content = await fs.readFile(absPath);
      fileSizeBytes = BigInt(content.byteLength);

      if (R2_ENABLED) {
        // TODO(04): R2 実アップロード
        publicUrl = options.fallbackUrl ?? null;
      } else if (options.contentType === "image/svg+xml") {
        const base64 = content.toString("base64");
        publicUrl = `data:image/svg+xml;base64,${base64}`;
      } else {
        publicUrl = options.fallbackUrl ?? null;
      }
    } catch {
      // ローカルファイルが見つからない場合は fallback のまま
      publicUrl = options.fallbackUrl ?? null;
    }
  }

  const file = await prisma.file.create({
    data: {
      uploadedByUserId: options.uploadedByUserId,
      originalName: options.originalName,
      storageKey,
      storageBucket,
      contentType: options.contentType,
      fileSizeBytes,
      fileCategory: options.category,
      isPublic: options.isPublic ?? true,
      publicUrl,
      imageWidth: options.imageWidth ?? null,
      imageHeight: options.imageHeight ?? null,
    },
    select: { id: true, publicUrl: true },
  });

  return file;
}
