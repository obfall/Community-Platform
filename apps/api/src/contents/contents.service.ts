import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import {
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  pgroongaSearchAndFetch,
} from "@/common/utils";
import { Prisma } from "@prisma/client";
import type { CreateContentDto } from "./dto/create-content.dto";
import type { ContentQueryDto } from "./dto/content-query.dto";
import * as crypto from "crypto";

@Injectable()
export class ContentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ContentQueryDto) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped);
    }
    return this.findAllStandard(query);
  }

  private async findAllStandard(query: ContentQueryDto) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.ContentWhereInput = { deletedAt: null };
    if (query.publishStatus && query.publishStatus !== "all") {
      where.publishStatus = query.publishStatus as "draft" | "published" | "unpublished";
    }
    if (query.contentType) where.contentType = query.contentType;

    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: this.contentListInclude(),
      }),
      this.prisma.content.count({ where }),
    ]);

    return this.formatContentList(data, total, page, limit);
  }

  /** pgroonga 全文検索。検索条件は通常一覧と一致させる（下書き含む）。 */
  private async searchByPgroonga(query: ContentQueryDto, escaped: string) {
    const { page, limit, offset } = extractPagination(query);

    const where = Prisma.sql`
      deleted_at IS NULL
      ${query.contentType ? Prisma.sql`AND content_type = ${query.contentType}` : Prisma.empty}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "contents",
      searchColumns: ["name", "description"],
      titleColumn: "name",
      snippetColumn: "description",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.content.findMany({
          where: { id: { in: ids }, deletedAt: null },
          include: this.contentListInclude(),
        }),
    });

    return this.formatContentList(records, total, page, limit, hitsById);
  }

  private contentListInclude() {
    return {
      createdBy: { select: { id: true, name: true } },
    } satisfies Prisma.ContentInclude;
  }

  private formatContentList(
    data: Array<
      Prisma.ContentGetPayload<{
        include: { createdBy: { select: { id: true; name: true } } };
      }>
    >,
    total: number,
    page: number,
    limit: number,
    hitsById?: Map<string, { titleHighlighted: string; snippetHighlighted: string }>,
  ) {
    return {
      data: data.map((c) => {
        const h = hitsById?.get(c.id);
        return {
          id: c.id,
          name: c.name,
          titleHighlighted: h?.titleHighlighted,
          contentType: c.contentType,
          description: c.description,
          snippetHighlighted: h?.snippetHighlighted,
          price: c.price,
          coverImageUrl: c.coverImageUrl,
          inviteToken: c.inviteToken,
          publishStatus: c.publishStatus,
          createdBy: c.createdBy,
          createdAt: c.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!content || content.deletedAt) throw new NotFoundException("コンテンツが見つかりません");
    return content;
  }

  async findByInviteToken(token: string) {
    const content = await this.prisma.content.findUnique({
      where: { inviteToken: token },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!content || content.deletedAt) throw new NotFoundException("コンテンツが見つかりません");
    return content;
  }

  async create(userId: string, dto: CreateContentDto) {
    const inviteToken = crypto.randomBytes(16).toString("hex");
    return this.prisma.content.create({
      data: {
        name: dto.name,
        contentType: dto.contentType,
        description: dto.description,
        price: dto.price,
        coverImageUrl: dto.coverImageUrl,
        inviteToken,
        publishStatus: (dto.publishStatus as "draft" | "published" | "unpublished") ?? "draft",
        createdByUserId: userId,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      contentType?: string;
      description?: string | null;
      price?: number | null;
      coverImageUrl?: string | null;
      publishStatus?: string;
    },
    currentUser: { id: string; role: string },
  ) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content || content.deletedAt) throw new NotFoundException("コンテンツが見つかりません");
    if (
      currentUser.role !== "admin" &&
      currentUser.role !== "owner" &&
      content.createdByUserId !== currentUser.id
    ) {
      throw new ForbiddenException("自分のコンテンツのみ更新できます");
    }
    return this.prisma.content.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contentType !== undefined && { contentType: data.contentType }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
        ...(data.publishStatus !== undefined && {
          publishStatus: data.publishStatus as "draft" | "published" | "unpublished",
        }),
      },
    });
  }

  async remove(id: string, currentUser: { id: string; role: string }) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content || content.deletedAt) throw new NotFoundException("コンテンツが見つかりません");
    if (
      currentUser.role !== "admin" &&
      currentUser.role !== "owner" &&
      content.createdByUserId !== currentUser.id
    ) {
      throw new ForbiddenException("自分のコンテンツのみ削除できます");
    }
    await this.prisma.content.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
