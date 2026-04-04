import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class BoardCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.boardCategory.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            posts: { where: { publishStatus: "published", deletedAt: null } },
          },
        },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      postCount: c._count.posts,
      createdAt: c.createdAt,
    }));
  }

  async create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.boardCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        createdByUserId: userId,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.boardCategory.findUnique({
      where: { id, deletedAt: null },
    });
    if (!category) throw new NotFoundException("カテゴリが見つかりません");

    return this.prisma.boardCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async softDelete(id: string) {
    const category = await this.prisma.boardCategory.findUnique({
      where: { id, deletedAt: null },
    });
    if (!category) throw new NotFoundException("カテゴリが見つかりません");

    await this.prisma.boardCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
