import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateAlbumDto } from "./dto/create-album.dto";
import type { AlbumQueryDto } from "./dto/album-query.dto";

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AlbumQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AlbumWhereInput = { deletedAt: null, publishStatus: "published" };
    if (query.search) where.title = { contains: query.search, mode: "insensitive" };
    if (query.categoryId) where.categoryId = query.categoryId;

    const [data, total] = await Promise.all([
      this.prisma.album.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.album.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        coverPhotoUrl: a.coverPhotoUrl,
        publishStatus: a.publishStatus,
        photoCount: a.photoCount,
        category: a.category,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
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

  async findOne(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        photos: {
          where: { publishStatus: "published" },
          orderBy: { sortOrder: "asc" },
          include: { file: { select: { id: true, publicUrl: true, originalName: true } } },
        },
      },
    });
    if (!album || album.deletedAt) throw new NotFoundException("アルバムが見つかりません");
    return album;
  }

  async create(userId: string, dto: CreateAlbumDto) {
    return this.prisma.album.create({
      data: {
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        createdByUserId: userId,
        publishStatus: "published",
      },
    });
  }

  async update(id: string, data: { title?: string; description?: string; publishStatus?: string }) {
    const album = await this.prisma.album.findUnique({ where: { id } });
    if (!album || album.deletedAt) throw new NotFoundException("アルバムが見つかりません");
    return this.prisma.album.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.publishStatus !== undefined && {
          publishStatus: data.publishStatus as "draft" | "published" | "archived",
        }),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.album.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // --- カテゴリ ---

  async getCategories() {
    return this.prisma.category.findMany({
      where: { scope: "album", isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createCategory(name: string) {
    const slug = `album-${Date.now()}`;
    return this.prisma.category.create({
      data: { scope: "album", slug, name },
    });
  }
}
