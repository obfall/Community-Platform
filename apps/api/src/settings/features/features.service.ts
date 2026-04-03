import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { ToggleFeatureDto } from "./dto";

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.featureSetting.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async toggle(featureKey: string, dto: ToggleFeatureDto, userId: string) {
    const feature = await this.prisma.featureSetting.findUnique({
      where: { featureKey },
    });
    if (!feature) throw new NotFoundException("機能が見つかりません");

    if (feature.category === "common") {
      throw new BadRequestException("共通機能は有効/無効を切り替えできません");
    }

    return this.prisma.featureSetting.update({
      where: { featureKey },
      data: {
        isEnabled: dto.isEnabled,
        enabledAt: dto.isEnabled ? new Date() : feature.enabledAt,
        disabledAt: dto.isEnabled ? feature.disabledAt : new Date(),
        updatedByUserId: userId,
      },
    });
  }
}
