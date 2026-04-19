import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateBroadcastSuppressionDto } from "./dto/create-broadcast-suppression.dto";

@Injectable()
export class BroadcastSuppressionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.broadcastSuppression.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateBroadcastSuppressionDto) {
    const existing = await this.prisma.broadcastSuppression.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException("このメールアドレスは既に配信停止リストに登録されています");

    return this.prisma.broadcastSuppression.create({
      data: { email: dto.email, reason: dto.reason },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.broadcastSuppression.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("配信停止エントリが見つかりません");

    await this.prisma.broadcastSuppression.delete({ where: { id } });
  }
}
