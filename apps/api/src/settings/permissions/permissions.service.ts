import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { PermissionQueryDto } from "./dto/permission-query.dto";
import type { CreatePermissionDto } from "./dto/create-permission.dto";
import type { UpdatePermissionDto } from "./dto/update-permission.dto";

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PermissionQueryDto) {
    return this.prisma.permissionSetting.findMany({
      where: query.featureKey ? { featureKey: query.featureKey } : undefined,
      include: {
        featureSetting: { select: { featureName: true, category: true } },
        requiredRank: { select: { name: true, slug: true } },
      },
      orderBy: [{ featureKey: "asc" }, { action: "asc" }],
    });
  }

  async create(dto: CreatePermissionDto) {
    const feature = await this.prisma.featureSetting.findUnique({
      where: { featureKey: dto.featureKey },
    });
    if (!feature) throw new NotFoundException("機能が見つかりません");

    const existing = await this.prisma.permissionSetting.findUnique({
      where: { featureKey_action: { featureKey: dto.featureKey, action: dto.action } },
    });
    if (existing) {
      throw new ConflictException("この機能とアクションの組み合わせは既に存在します");
    }

    return this.prisma.permissionSetting.create({
      data: {
        featureKey: dto.featureKey,
        action: dto.action,
        allowedRoles: dto.allowedRoles,
        requiredRankId: dto.requiredRankId,
      },
      include: {
        featureSetting: { select: { featureName: true } },
        requiredRank: { select: { name: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePermissionDto) {
    const existing = await this.prisma.permissionSetting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("権限設定が見つかりません");

    return this.prisma.permissionSetting.update({
      where: { id },
      data: {
        ...(dto.allowedRoles !== undefined && { allowedRoles: dto.allowedRoles }),
        ...(dto.requiredRankId !== undefined && { requiredRankId: dto.requiredRankId }),
      },
      include: {
        featureSetting: { select: { featureName: true } },
        requiredRank: { select: { name: true } },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.permissionSetting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("権限設定が見つかりません");

    await this.prisma.permissionSetting.delete({ where: { id } });
  }
}
