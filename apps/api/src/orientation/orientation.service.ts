import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateOrientationPageDto } from "./dto/create-orientation-page.dto";
import type { UpdateOrientationPageDto } from "./dto/update-orientation-page.dto";

@Injectable()
export class OrientationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPages() {
    return this.prisma.orientationPage.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async findOnePage(id: string) {
    const page = await this.prisma.orientationPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("ページが見つかりません");
    return page;
  }

  async createPage(dto: CreateOrientationPageDto) {
    return this.prisma.orientationPage.create({
      data: {
        title: dto.title,
        body: dto.body,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async updatePage(id: string, data: UpdateOrientationPageDto) {
    const existing = await this.prisma.orientationPage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("ページが見つかりません");
    return this.prisma.orientationPage.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
  }

  async removePage(id: string) {
    const existing = await this.prisma.orientationPage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("ページが見つかりません");
    await this.prisma.orientationPage.delete({ where: { id } });
  }

  async complete(userId: string) {
    return this.prisma.orientationCompletion.upsert({
      where: { userId },
      update: { completedAt: new Date() },
      create: { userId },
    });
  }

  async getMyCompletion(userId: string) {
    return this.prisma.orientationCompletion.findUnique({ where: { userId } });
  }
}
