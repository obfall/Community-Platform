import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class OptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** オプション対象の機能一覧（category = optional のみ） */
  async findAll() {
    return this.prisma.featureSetting.findMany({
      where: { category: "optional" },
      orderBy: { sortOrder: "asc" },
      select: {
        featureKey: true,
        featureName: true,
        isAvailable: true,
        isEnabled: true,
        description: true,
        sortOrder: true,
      },
    });
  }

  /** オプション機能の利用可否を切り替え */
  async toggle(featureKey: string, isAvailable: boolean, userId: string) {
    const feature = await this.prisma.featureSetting.findUnique({
      where: { featureKey },
    });
    if (!feature) throw new NotFoundException("機能が見つかりません");
    if (feature.category !== "optional") {
      throw new BadRequestException("共通機能の利用可否は変更できません");
    }

    return this.prisma.featureSetting.update({
      where: { featureKey },
      data: {
        isAvailable,
        // 利用不可にした場合は isEnabled も false にする
        ...(isAvailable === false && { isEnabled: false, disabledAt: new Date() }),
        updatedByUserId: userId,
      },
    });
  }
}
