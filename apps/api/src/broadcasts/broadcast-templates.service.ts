import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import { sanitizeRichText } from "@/common/utils";
import type { CreateBroadcastTemplateDto } from "./dto/create-broadcast-template.dto";
import type { UpdateBroadcastTemplateDto } from "./dto/update-broadcast-template.dto";

const CACHE_KEY = "master:broadcast-templates:all";
const CACHE_PREFIX = "master:broadcast-templates:";
const CACHE_TTL_SEC = 60 * 60;

@Injectable()
export class BroadcastTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.getOrSet(
      CACHE_KEY,
      async () => {
        const templates = await this.prisma.broadcastTemplate.findMany({
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        });
        return templates.map((t) => this.mapTemplate(t));
      },
      CACHE_TTL_SEC,
    );
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
    await this.cache.invalidate(CACHE_PREFIX);
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
    await this.cache.invalidate(CACHE_PREFIX);
    return this.mapTemplate(template);
  }

  async remove(id: string) {
    const existing = await this.prisma.broadcastTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("テンプレートが見つかりません");

    await this.prisma.broadcastTemplate.delete({ where: { id } });
    await this.cache.invalidate(CACHE_PREFIX);
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
