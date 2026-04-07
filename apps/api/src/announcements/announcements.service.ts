import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import type { UpdateAnnouncementDto } from "./dto/update-announcement.dto";

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(targetAudience?: string) {
    const where: Prisma.AnnouncementWhereInput = { isPublished: true };
    if (targetAudience) where.targetAudience = targetAudience as "all" | "admin" | "member";
    return this.prisma.announcement.findMany({
      where,
      orderBy: [{ pinnedUntil: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }],
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!announcement) throw new NotFoundException("お知らせが見つかりません");
    return announcement;
  }

  async create(userId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.body,
        targetAudience: dto.targetAudience ?? "all",
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        pinnedUntil: dto.pinnedUntil ? new Date(dto.pinnedUntil) : null,
        createdByUserId: userId,
      },
    });
  }

  async update(id: string, data: UpdateAnnouncementDto) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("お知らせが見つかりません");
    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.targetAudience !== undefined && {
          targetAudience: data.targetAudience as "all" | "admin" | "member",
        }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.publishedAt !== undefined && { publishedAt: new Date(data.publishedAt) }),
        ...(data.pinnedUntil !== undefined && { pinnedUntil: new Date(data.pinnedUntil) }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("お知らせが見つかりません");
    await this.prisma.announcement.delete({ where: { id } });
  }
}
