import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import type { CreateOrientationPageDto } from "./dto/create-orientation-page.dto";
import type { UpdateOrientationPageDto } from "./dto/update-orientation-page.dto";

const CACHE_KEY = "master:orientation-pages:all";
const CACHE_PREFIX = "master:orientation-pages:";
const CACHE_TTL_SEC = 60 * 60;

@Injectable()
export class OrientationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAllPages() {
    return this.cache.getOrSet(
      CACHE_KEY,
      () =>
        this.prisma.orientationPage.findMany({
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
        }),
      CACHE_TTL_SEC,
    );
  }

  async findOnePage(id: string) {
    const page = await this.prisma.orientationPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("ページが見つかりません");
    return page;
  }

  async createPage(dto: CreateOrientationPageDto) {
    const created = await this.prisma.orientationPage.create({
      data: {
        title: dto.title,
        body: dto.body,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
    await this.cache.invalidate(CACHE_PREFIX);
    return created;
  }

  async updatePage(id: string, data: UpdateOrientationPageDto) {
    const existing = await this.prisma.orientationPage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("ページが見つかりません");
    const updated = await this.prisma.orientationPage.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
    await this.cache.invalidate(CACHE_PREFIX);
    return updated;
  }

  async removePage(id: string) {
    const existing = await this.prisma.orientationPage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("ページが見つかりません");
    await this.prisma.orientationPage.delete({ where: { id } });
    await this.cache.invalidate(CACHE_PREFIX);
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
