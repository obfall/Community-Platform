import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import type { UpdateAppSettingDto } from "./dto";

const CACHE_KEY = "master:app-settings:all";
const CACHE_PREFIX = "master:app-settings:";
const CACHE_TTL_SEC = 60 * 60;

@Injectable()
export class AppSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.getOrSet(
      CACHE_KEY,
      () =>
        this.prisma.appSetting.findMany({
          orderBy: { key: "asc" },
        }),
      CACHE_TTL_SEC,
    );
  }

  async update(key: string, dto: UpdateAppSettingDto, userId: string) {
    const existing = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException("設定が見つかりません");

    const updated = await this.prisma.appSetting.update({
      where: { key },
      data: {
        value: dto.value,
        updatedByUserId: userId,
      },
    });
    await this.cache.invalidate(CACHE_PREFIX);
    return updated;
  }
}
