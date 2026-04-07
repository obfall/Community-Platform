import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateMemoDto } from "./dto/create-memo.dto";
import type { UpdateMemoDto } from "./dto/update-memo.dto";

@Injectable()
export class MemosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: { categoryId?: string; search?: string }) {
    const where: Prisma.MemoWhereInput = { userId, deletedAt: null };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) where.title = { contains: query.search, mode: "insensitive" };
    return this.prisma.memo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async findOne(userId: string, id: string) {
    const memo = await this.prisma.memo.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        attachments: {
          orderBy: { sortOrder: "asc" },
          include: {
            file: {
              select: { id: true, publicUrl: true, originalName: true, contentType: true },
            },
          },
        },
      },
    });
    if (!memo || memo.deletedAt) throw new NotFoundException("メモが見つかりません");
    if (memo.userId !== userId) throw new ForbiddenException("アクセス権がありません");
    return memo;
  }

  async create(userId: string, dto: CreateMemoDto) {
    const memo = await this.prisma.memo.create({
      data: {
        userId,
        title: dto.title,
        body: dto.description,
        categoryId: dto.categoryId,
      },
    });
    if (dto.attachmentFileIds && dto.attachmentFileIds.length > 0) {
      await this.prisma.memoAttachment.createMany({
        data: dto.attachmentFileIds.map((fileId, i) => ({
          memoId: memo.id,
          fileId,
          sortOrder: i,
        })),
      });
    }
    return memo;
  }

  async update(userId: string, id: string, data: UpdateMemoDto) {
    const memo = await this.prisma.memo.findUnique({ where: { id } });
    if (!memo || memo.deletedAt) throw new NotFoundException("メモが見つかりません");
    if (memo.userId !== userId) throw new ForbiddenException("アクセス権がありません");

    const updated = await this.prisma.memo.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { body: data.description }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
    });

    if (data.attachmentFileIds !== undefined) {
      await this.prisma.memoAttachment.deleteMany({ where: { memoId: id } });
      if (data.attachmentFileIds.length > 0) {
        await this.prisma.memoAttachment.createMany({
          data: data.attachmentFileIds.map((fileId, i) => ({
            memoId: id,
            fileId,
            sortOrder: i,
          })),
        });
      }
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    const memo = await this.prisma.memo.findUnique({ where: { id } });
    if (!memo || memo.deletedAt) throw new NotFoundException("メモが見つかりません");
    if (memo.userId !== userId) throw new ForbiddenException("アクセス権がありません");
    await this.prisma.memo.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // --- カテゴリ ---

  async getCategories(userId: string) {
    return this.prisma.memoCategory.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createCategory(userId: string, name: string) {
    return this.prisma.memoCategory.create({ data: { userId, name } });
  }

  async removeCategory(userId: string, id: string) {
    const cat = await this.prisma.memoCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException("カテゴリが見つかりません");
    if (cat.userId !== userId) throw new ForbiddenException("アクセス権がありません");
    await this.prisma.memoCategory.delete({ where: { id } });
  }
}
