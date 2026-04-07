import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateFaqDto } from "./dto/create-faq.dto";
import type { UpdateFaqDto } from "./dto/update-faq.dto";

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string) {
    const where: Prisma.FaqArticleWhereInput = { isPublished: true };
    if (category) where.category = category;
    return this.prisma.faqArticle.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
  }

  async getCategories() {
    const rows = await this.prisma.faqArticle.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return rows.map((r) => r.category);
  }

  async findOne(id: string) {
    const faq = await this.prisma.faqArticle.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException("FAQが見つかりません");
    await this.prisma.faqArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return faq;
  }

  async create(dto: CreateFaqDto) {
    return this.prisma.faqArticle.create({
      data: {
        category: dto.category,
        title: dto.title,
        body: dto.body,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async update(id: string, data: UpdateFaqDto) {
    const existing = await this.prisma.faqArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("FAQが見つかりません");
    return this.prisma.faqArticle.update({
      where: { id },
      data: {
        ...(data.category !== undefined && { category: data.category }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.faqArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("FAQが見つかりません");
    await this.prisma.faqArticle.delete({ where: { id } });
  }
}
