import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import {
  escapePgroongaQuery,
  pgroongaSearchAndFetch,
  PGROONGA_MAX_LIMIT,
  VISIBILITY,
} from "@/common/utils";
import { Prisma } from "@prisma/client";
import type { CreateFaqDto } from "./dto/create-faq.dto";
import type { UpdateFaqDto } from "./dto/update-faq.dto";
import type { FaqQueryDto } from "./dto/faq-query.dto";

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FaqQueryDto = {}) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped);
    }
    const where: Prisma.FaqArticleWhereInput = { isPublished: true };
    if (query.category) where.category = query.category;
    return this.prisma.faqArticle.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
  }

  /** pgroonga 全文検索（VISIBILITY.faqArticle: isPublished=true 強制）。 */
  private async searchByPgroonga(query: FaqQueryDto, escaped: string) {
    const where = Prisma.sql`
      is_published = true
      ${query.category ? Prisma.sql`AND category = ${query.category}` : Prisma.empty}
    `;

    // FAQ は通常パスがページネーションを返さない（findMany 直返し）ため、
    // 検索パスもキャップ値で打ち切って配列返却にしている。
    // 中期改善: 全 12 ドメインの一覧 API をページ送り化（バックログ）。
    const { records, hitsById } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "faq_articles",
      searchColumns: ["title", "body"],
      titleColumn: "title",
      snippetColumn: "body",
      escaped,
      where,
      limit: PGROONGA_MAX_LIMIT,
      offset: 0,
      fetchByIds: (ids) =>
        this.prisma.faqArticle.findMany({
          where: { id: { in: ids }, ...VISIBILITY.faqArticle },
        }),
    });

    return records.map((f) => {
      const h = hitsById.get(f.id);
      return {
        ...f,
        titleHighlighted: h?.titleHighlighted,
        snippetHighlighted: h?.snippetHighlighted,
      };
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
