import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { UpdateAppSettingDto } from "./dto";

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.appSetting.findMany({
      orderBy: { key: "asc" },
    });
  }

  async update(key: string, dto: UpdateAppSettingDto, userId: string) {
    const existing = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException("設定が見つかりません");

    return this.prisma.appSetting.update({
      where: { key },
      data: {
        value: dto.value,
        updatedByUserId: userId,
      },
    });
  }
}
