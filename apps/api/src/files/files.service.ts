import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
import { PrismaService } from "@/prisma/prisma.service";
import { StorageService } from "./storage/storage.service";
import type { UploadFileDto } from "./dto/upload-file.dto";
import type { FileQueryDto } from "./dto/file-query.dto";

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

const MAX_FILE_SIZE: Record<string, number> = {
  avatar: 5 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  general: 10 * 1024 * 1024,
};

const THUMBNAIL_SIZE = 300;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(file: Express.Multer.File, dto: UploadFileDto, userId: string) {
    this.validateFile(file, dto.fileCategory);

    const fileId = randomUUID();
    const storageKey = `${dto.fileCategory}/${fileId}/${file.originalname}`;
    const checksum = createHash("sha256").update(file.buffer).digest("hex");

    let imageWidth: number | null = null;
    let imageHeight: number | null = null;
    let thumbnailStorageKey: string | null = null;

    const isImage =
      dto.fileCategory !== "video" &&
      dto.fileCategory !== "document" &&
      file.mimetype.startsWith("image/") &&
      file.mimetype !== "image/svg+xml";

    if (isImage) {
      const metadata = await sharp(file.buffer).metadata();
      imageWidth = metadata.width ?? null;
      imageHeight = metadata.height ?? null;

      const thumbnailBuffer = await sharp(file.buffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();

      thumbnailStorageKey = `${dto.fileCategory}/${fileId}/thumbnail.webp`;
      await this.storage.upload(thumbnailStorageKey, thumbnailBuffer, "image/webp");
    }

    const publicUrl = await this.storage.upload(storageKey, file.buffer, file.mimetype);

    return this.prisma.file.create({
      data: {
        originalName: file.originalname,
        storageKey,
        storageBucket: "community-files",
        contentType: file.mimetype,
        fileSizeBytes: file.size,
        fileCategory: dto.fileCategory,
        imageWidth,
        imageHeight,
        thumbnailStorageKey,
        checksumSha256: checksum,
        isPublic: dto.isPublic ?? false,
        publicUrl,
        uploadedByUser: { connect: { id: userId } },
      },
    });
  }

  async findAll(query: FileQueryDto, userId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      uploadedByUserId: userId,
      deletedAt: null,
      ...(query.fileCategory && { fileCategory: query.fileCategory }),
    };

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.file.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: files.map((f) => ({
        ...f,
        fileSizeBytes: Number(f.fileSizeBytes),
        thumbnailUrl: f.thumbnailStorageKey
          ? this.storage.getPublicUrl(f.thumbnailStorageKey)
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id, deletedAt: null },
    });
    if (!file) throw new NotFoundException("ファイルが見つかりません");

    if (file.uploadedByUserId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== "owner" && user?.role !== "admin") {
        throw new ForbiddenException("このファイルにアクセスする権限がありません");
      }
    }

    return {
      ...file,
      fileSizeBytes: Number(file.fileSizeBytes),
      thumbnailUrl: file.thumbnailStorageKey
        ? this.storage.getPublicUrl(file.thumbnailStorageKey)
        : null,
    };
  }

  async remove(id: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id, deletedAt: null },
    });
    if (!file) throw new NotFoundException("ファイルが見つかりません");

    if (file.uploadedByUserId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== "owner" && user?.role !== "admin") {
        throw new ForbiddenException("このファイルを削除する権限がありません");
      }
    }

    await this.prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private validateFile(file: Express.Multer.File, category: string): void {
    const DEFAULT_MAX = 10 * 1024 * 1024;
    const maxSize = MAX_FILE_SIZE[category] ?? DEFAULT_MAX;
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestException(`ファイルサイズが上限（${maxMB}MB）を超えています`);
    }

    const allowedTypes = ALLOWED_MIME_TYPES[category];
    if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `このカテゴリでは ${file.mimetype} 形式のファイルはアップロードできません`,
      );
    }
  }
}
