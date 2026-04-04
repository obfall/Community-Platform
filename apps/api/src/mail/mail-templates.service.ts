import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateMailTemplateDto } from "./dto/create-mail-template.dto";
import type { UpdateMailTemplateDto } from "./dto/update-mail-template.dto";

@Injectable()
export class MailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const templates = await this.prisma.mailTemplate.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    return templates.map((t) => this.mapTemplate(t));
  }

  async create(dto: CreateMailTemplateDto) {
    const template = await this.prisma.mailTemplate.create({
      data: {
        name: dto.name,
        category: dto.category,
        subjectTemplate: dto.subjectTemplate,
        bodyHtmlTemplate: dto.bodyHtmlTemplate,
        bodyTextTemplate: dto.bodyTextTemplate,
        availableVariables: dto.availableVariables ?? undefined,
      },
    });
    return this.mapTemplate(template);
  }

  async update(id: string, dto: UpdateMailTemplateDto) {
    const existing = await this.prisma.mailTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("テンプレートが見つかりません");

    const template = await this.prisma.mailTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.subjectTemplate !== undefined && { subjectTemplate: dto.subjectTemplate }),
        ...(dto.bodyHtmlTemplate !== undefined && { bodyHtmlTemplate: dto.bodyHtmlTemplate }),
        ...(dto.bodyTextTemplate !== undefined && { bodyTextTemplate: dto.bodyTextTemplate }),
        ...(dto.availableVariables !== undefined && {
          availableVariables: dto.availableVariables,
        }),
      },
    });
    return this.mapTemplate(template);
  }

  async remove(id: string) {
    const existing = await this.prisma.mailTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("テンプレートが見つかりません");

    await this.prisma.mailTemplate.delete({ where: { id } });
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
