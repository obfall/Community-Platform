import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@/prisma/prisma.service";
import {
  AUTHOR_SELECT,
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  formatAuthor,
  pgroongaSearchAndFetch,
  VISIBILITY,
} from "@/common/utils";
import { BoardCoreService } from "./core/board-core.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";
import type { CreateTopicDto } from "./dto/create-topic.dto";
import type { UpdateTopicDto } from "./dto/update-topic.dto";
import type { TopicQueryDto } from "./dto/topic-query.dto";

@Injectable()
export class BoardTopicsService {
  constructor(
    private readonly core: BoardCoreService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(userId: string, query: TopicQueryDto) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(userId, query, escaped);
    }
    return this.core.findAllTopics(GLOBAL_BOARD_SCOPE, userId, query);
  }

  /** Global Board トピックの pgroonga 全文検索（VISIBILITY.boardTopic 強制）。 */
  private async searchByPgroonga(userId: string, query: TopicQueryDto, escaped: string) {
    const { page, limit, offset } = extractPagination(query);

    const where = Prisma.sql`
      deleted_at IS NULL
      AND publish_status = 'published'::"PublishStatus"
      ${query.categoryId ? Prisma.sql`AND category_id = ${query.categoryId}::uuid` : Prisma.empty}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "board_topics",
      searchColumns: ["title", "body"],
      titleColumn: "title",
      snippetColumn: "body",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.boardTopic.findMany({
          where: { id: { in: ids }, ...VISIBILITY.boardTopic },
          include: {
            author: { select: AUTHOR_SELECT },
            category: { select: { id: true, name: true } },
          },
        }),
    });

    const topicIds = records.map((t) => t.id);
    const userLikes = await this.prisma.boardLike.findMany({
      where: { userId, targetType: "topic", targetId: { in: topicIds } },
      select: { targetId: true },
    });
    const likedSet = new Set(userLikes.map((l) => l.targetId));

    return {
      data: records.map((t) => {
        const h = hitsById.get(t.id);
        return {
          id: t.id,
          title: t.title,
          body: t.body,
          titleHighlighted: h?.titleHighlighted,
          snippetHighlighted: h?.snippetHighlighted,
          publishStatus: t.publishStatus,
          isPinned: t.isPinned,
          sortOrder: t.sortOrder,
          viewCount: t.viewCount,
          postCount: t.postCount,
          likeCount: t.likeCount,
          author: formatAuthor(t.author),
          category: t.category,
          isLiked: likedSet.has(t.id),
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  findOne(userId: string, topicId: string) {
    return this.core.findOneTopic(GLOBAL_BOARD_SCOPE, userId, topicId);
  }

  create(userId: string, dto: CreateTopicDto) {
    return this.core.createTopic(GLOBAL_BOARD_SCOPE, userId, dto);
  }

  update(userId: string, topicId: string, dto: UpdateTopicDto) {
    return this.core.updateTopic(GLOBAL_BOARD_SCOPE, userId, topicId, dto);
  }

  reorder(items: { id: string; sortOrder: number }[]) {
    return this.core.reorderTopics(GLOBAL_BOARD_SCOPE, items);
  }

  softDelete(userId: string, topicId: string) {
    return this.core.softDeleteTopic(GLOBAL_BOARD_SCOPE, userId, topicId);
  }

  togglePin(topicId: string) {
    return this.core.toggleTopicPin(GLOBAL_BOARD_SCOPE, topicId);
  }
}
