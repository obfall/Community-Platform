import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateLibraryItemDto } from "./dto/create-library-item.dto";
import type { UpdateLibraryItemDto } from "./dto/update-library-item.dto";

@Injectable()
export class UserLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.userLibraryItem.findMany({
      where: { userId },
      include: { file: { select: { id: true, originalName: true, publicUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, userId: string) {
    const item = await this.prisma.userLibraryItem.findUnique({
      where: { id },
      include: { file: { select: { id: true, originalName: true, publicUrl: true } } },
    });
    if (!item) throw new NotFoundException("ライブラリーアイテムが見つかりません");
    if (item.userId !== userId) throw new ForbiddenException();
    return item;
  }

  async create(userId: string, dto: CreateLibraryItemDto) {
    return this.prisma.userLibraryItem.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        author: dto.author,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        pageCount: dto.pageCount,
        impression: dto.impression,
        status: dto.status ?? "unread",
        fileId: dto.fileId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateLibraryItemDto) {
    const item = await this.prisma.userLibraryItem.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!item) throw new NotFoundException("ライブラリーアイテムが見つかりません");
    if (item.userId !== userId) throw new ForbiddenException();

    return this.prisma.userLibraryItem.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    const item = await this.prisma.userLibraryItem.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!item) throw new NotFoundException("ライブラリーアイテムが見つかりません");
    if (item.userId !== userId) throw new ForbiddenException();

    await this.prisma.userLibraryItem.delete({ where: { id } });
  }
}
