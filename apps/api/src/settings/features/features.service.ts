import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import type { ToggleFeatureDto } from "./dto";

const CACHE_KEY = "master:feature-settings:all";
const CACHE_PREFIX = "master:feature-settings:";
const CACHE_TTL_SEC = 60 * 60; // 1 時間

@Injectable()
export class FeaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.getOrSet(
      CACHE_KEY,
      () =>
        this.prisma.featureSetting.findMany({
          where: { isAvailable: true },
          orderBy: { sortOrder: "asc" },
        }),
      CACHE_TTL_SEC,
    );
  }

  async toggle(featureKey: string, dto: ToggleFeatureDto, userId: string) {
    const feature = await this.prisma.featureSetting.findUnique({
      where: { featureKey },
    });
    if (!feature) throw new NotFoundException("機能が見つかりません");

    if (feature.category === "common") {
      throw new BadRequestException("共通機能は有効/無効を切り替えできません");
    }
    if (!feature.isAvailable) {
      throw new BadRequestException("この機能はオプション設定で無効化されています");
    }

    const updated = await this.prisma.featureSetting.update({
      where: { featureKey },
      data: {
        isEnabled: dto.isEnabled,
        enabledAt: dto.isEnabled ? new Date() : feature.enabledAt,
        disabledAt: dto.isEnabled ? feature.disabledAt : new Date(),
        updatedByUserId: userId,
      },
    });
    await this.cache.invalidate(CACHE_PREFIX);
    return updated;
  }
}
