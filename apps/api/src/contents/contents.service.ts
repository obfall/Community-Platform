import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateContentDto } from "./dto/create-content.dto";
import * as crypto from "crypto";

@Injectable()
export class ContentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number | string;
    limit?: number | string;
    search?: string;
    contentType?: string;
    publishStatus?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.ContentWhereInput = { deletedAt: null };
    if (query.publishStatus && query.publishStatus !== "all") {
      where.publishStatus = query.publishStatus as "draft" | "published" | "archived";
    }
    if (query.search) where.name = { contains: query.search, mode: "insensitive" };
    if (query.contentType) where.contentType = query.contentType;

    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      this.prisma.content.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map((c) => ({
        id: c.id,
        name: c.name,
        contentType: c.contentType,
        description: c.description,
        price: c.price,
        coverImageUrl: c.coverImageUrl,
        inviteToken: c.inviteToken,
        publishStatus: c.publishStatus,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
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
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!content || content.deletedAt) throw new NotFoundException("コンテンツが見つかりません");
    return content;
  }

  async create(userId: string, dto: CreateContentDto) {
    const inviteToken = crypto.randomBytes(16).toString("hex");
    return this.prisma.content.create({
      data: {
        name: dto.name,
        contentType: dto.contentType,
        description: dto.description,
        price: dto.price,
        coverImageUrl: dto.coverImageUrl,
        inviteToken,
        publishStatus: (dto.publishStatus as "draft" | "published" | "archived") ?? "draft",
        createdByUserId: userId,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      contentType?: string;
      description?: string | null;
      price?: number | null;
      coverImageUrl?: string | null;
      publishStatus?: string;
    },
  ) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content || content.deletedAt) throw new NotFoundException("コンテンツが見つかりません");
    return this.prisma.content.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contentType !== undefined && { contentType: data.contentType }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
        ...(data.publishStatus !== undefined && {
          publishStatus: data.publishStatus as "draft" | "published" | "archived",
        }),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.content.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
