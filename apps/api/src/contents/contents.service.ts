import { HttpStatus, Injectable } from "@nestjs/common";
import { ErrorCode } from "@community-platform/shared";
import { PrismaService } from "@/prisma/prisma.service";
import { BusinessException } from "@/common/exceptions";
import errorMessages from "@/i18n/messages/ja/errors.json";
import {
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  pgroongaSearchAndFetch,
} from "@/common/utils";
import { Prisma } from "@prisma/client";
import type { CreateContentDto } from "./dto/create-content.dto";
import type { ContentQueryDto } from "./dto/content-query.dto";

type CurrentUser = { id: string; role: string };

function isPrivileged(user: CurrentUser) {
  return user.role === "admin" || user.role === "owner";
}

function notFoundContent() {
  return new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    errorMessages.not_found.content,
    undefined,
    "errors.not_found.content",
  );
}

function forbidden(resourceKey: "content_update" | "content_delete") {
  return new BusinessException(
    ErrorCode.FORBIDDEN,
    HttpStatus.FORBIDDEN,
    errorMessages.forbidden_resource[resourceKey],
    undefined,
    `errors.forbidden_resource.${resourceKey}`,
  );
}

function canMutateContent(content: { createdByUserId: string }, user: CurrentUser) {
  return isPrivileged(user) || content.createdByUserId === user.id;
}

@Injectable()
export class ContentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 一覧の可視性条件:
   * - published: 全員に表示
   * - draft / unpublished: 作成者本人のみ表示（admin / owner は全件表示）
   */
  private visibilityWhere(currentUser: CurrentUser): Prisma.ContentWhereInput {
    if (isPrivileged(currentUser)) return {};
    return {
      OR: [{ publishStatus: "published" }, { createdByUserId: currentUser.id }],
    };
  }

  async findAll(query: ContentQueryDto, currentUser: CurrentUser) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped, currentUser);
    }
    return this.findAllStandard(query, currentUser);
  }

  private async findAllStandard(query: ContentQueryDto, currentUser: CurrentUser) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.ContentWhereInput = {
      deletedAt: null,
      ...this.visibilityWhere(currentUser),
    };
    // クライアントから指定された publishStatus は可視性ヘルパ上で更に絞り込む（all は無視）
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

  /** pgroonga 全文検索。published に加えて作成者自身の下書きも対象（admin/owner は全件）。 */
  private async searchByPgroonga(
    query: ContentQueryDto,
    escaped: string,
    currentUser: CurrentUser,
  ) {
    const { page, limit, offset } = extractPagination(query);

    const visibilitySql = isPrivileged(currentUser)
      ? Prisma.empty
      : Prisma.sql`AND (publish_status = 'published'::"PublishStatus" OR created_by_user_id = ${currentUser.id}::uuid)`;

    const where = Prisma.sql`
      deleted_at IS NULL
      ${visibilitySql}
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
          where: { id: { in: ids }, deletedAt: null, ...this.visibilityWhere(currentUser) },
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
          publishStatus: c.publishStatus,
          createdBy: c.createdBy,
          createdAt: c.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string, currentUser: CurrentUser) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!content || content.deletedAt) throw notFoundContent();
    if (content.publishStatus !== "published" && !canMutateContent(content, currentUser)) {
      // draft / unpublished の他人コンテンツは存在自体を漏らさない
      throw notFoundContent();
    }
    return content;
  }

  async create(currentUserId: string, dto: CreateContentDto) {
    return this.prisma.content.create({
      data: {
        name: dto.name,
        contentType: dto.contentType,
        description: dto.description,
        price: dto.price,
        coverImageUrl: dto.coverImageUrl,
        publishStatus: (dto.publishStatus as "draft" | "published" | "unpublished") ?? "draft",
        createdByUserId: currentUserId,
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
    currentUser: CurrentUser,
  ) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content || content.deletedAt) throw notFoundContent();
    if (!canMutateContent(content, currentUser)) throw forbidden("content_update");

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

  async remove(id: string, currentUser: CurrentUser) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content || content.deletedAt) throw notFoundContent();
    if (!canMutateContent(content, currentUser)) throw forbidden("content_delete");
    await this.prisma.content.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
