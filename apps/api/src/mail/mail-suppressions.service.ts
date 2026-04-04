import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateMailSuppressionDto } from "./dto/create-mail-suppression.dto";

@Injectable()
export class MailSuppressionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.mailSuppression.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateMailSuppressionDto) {
    const existing = await this.prisma.mailSuppression.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException("このメールアドレスは既に配信停止リストに登録されています");

    return this.prisma.mailSuppression.create({
      data: { email: dto.email, reason: dto.reason },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.mailSuppression.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("配信停止エントリが見つかりません");

    await this.prisma.mailSuppression.delete({ where: { id } });
  }
}
