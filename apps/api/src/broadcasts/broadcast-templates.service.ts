import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { sanitizeRichText } from "@/common/utils";
import type { CreateBroadcastTemplateDto } from "./dto/create-broadcast-template.dto";
import type { UpdateBroadcastTemplateDto } from "./dto/update-broadcast-template.dto";

@Injectable()
export class BroadcastTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const templates = await this.prisma.broadcastTemplate.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    return templates.map((t) => this.mapTemplate(t));
  }

  async create(dto: CreateBroadcastTemplateDto) {
    const template = await this.prisma.broadcastTemplate.create({
      data: {
        name: dto.name,
        category: dto.category,
        subjectTemplate: dto.subjectTemplate,
        bodyHtmlTemplate: sanitizeRichText(dto.bodyHtmlTemplate),
        bodyTextTemplate: dto.bodyTextTemplate,
        availableVariables: dto.availableVariables ?? undefined,
      },
    });
    return this.mapTemplate(template);
  }

  async update(id: string, dto: UpdateBroadcastTemplateDto) {
    const existing = await this.prisma.broadcastTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("テンプレートが見つかりません");

    const template = await this.prisma.broadcastTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.subjectTemplate !== undefined && { subjectTemplate: dto.subjectTemplate }),
        ...(dto.bodyHtmlTemplate !== undefined && {
          bodyHtmlTemplate: sanitizeRichText(dto.bodyHtmlTemplate),
        }),
        ...(dto.bodyTextTemplate !== undefined && { bodyTextTemplate: dto.bodyTextTemplate }),
        ...(dto.availableVariables !== undefined && {
          availableVariables: dto.availableVariables,
        }),
      },
    });
    return this.mapTemplate(template);
  }

  async remove(id: string) {
    const existing = await this.prisma.broadcastTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("テンプレートが見つかりません");

    await this.prisma.broadcastTemplate.delete({ where: { id } });
  }

  private mapTemplate(t: {
    id: string;
    name: string;
    category: string;
    subjectTemplate: string;
    bodyHtmlTemplate: string;
    bodyTextTemplate: string | null;
    availableVariables: unknown;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      subjectTemplate: t.subjectTemplate,
      bodyHtmlTemplate: t.bodyHtmlTemplate,
      bodyTextTemplate: t.bodyTextTemplate,
      availableVariables: t.availableVariables as string[] | null,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
