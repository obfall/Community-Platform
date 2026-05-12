import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ErrorCode } from "@community-platform/shared";
import { PrismaService } from "@/prisma/prisma.service";
import { BusinessException } from "@/common/exceptions";
import errorMessages from "@/i18n/messages/ja/errors.json";
import type { CreateCategoryDto } from "../dto/create-category.dto";
import type { UpdateCategoryDto } from "../dto/update-category.dto";
import type { CreateTopicDto } from "../dto/create-topic.dto";
import type { UpdateTopicDto } from "../dto/update-topic.dto";
import type { TopicQueryDto } from "../dto/topic-query.dto";
import type { CreateTopicPostDto } from "../dto/create-topic-post.dto";
import type { UpdateTopicPostDto } from "../dto/update-topic-post.dto";
import type { CreateTopicPostCommentDto } from "../dto/create-topic-post-comment.dto";
import type { UpdateTopicPostCommentDto } from "../dto/update-topic-post-comment.dto";
import type { PaginationQueryDto } from "@/common/dto/pagination.dto";
import { AUTHOR_SELECT, type AuthorLike, formatAuthor, VISIBILITY } from "@/common/utils";

/**
 * スコープ設定。各スコープで使用する Prisma delegate 名と、スコープを絞り込むフィールド名を指定する。
 * scopeField が null の場合はグローバルスコープ（スコープ絞り込みなし）。
 */
export interface BoardScopeConfig {
  categoryDelegate: string;
  topicDelegate: string;
  topicPostDelegate: string;
  topicPostCommentDelegate: string;
  likeDelegate: string;
  /** Category / Topic に載るスコープ列名。Global のときは null */
  scopeField: "projectId" | "eventId" | null;
}

type TopicRaw = {
  id: string;
  title: string;
  body: string;
  publishStatus: string;
  isPinned: boolean;
  sortOrder: number;
  viewCount: number;
  postCount: number;
  likeCount: number;
  author: AuthorLike;
  category: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
};

type PostRaw = {
  id: string;
  body: string;
  likeCount: number;
  commentCount: number;
  author: AuthorLike;
  createdAt: Date;
  updatedAt: Date;
};

type CommentRaw = {
  id: string;
  body: string;
  likeCount: number;
  author: AuthorLike;
  createdAt: Date;
  updatedAt: Date;
};

const TOPIC_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  category: { select: { id: true, name: true } },
} as const;

const POST_INCLUDE = {
  author: { select: AUTHOR_SELECT },
} as const;

const COMMENT_INCLUDE = {
  author: { select: AUTHOR_SELECT },
} as const;

/**
 * 掲示板のコア CRUD ロジック。Global / Project / Event 全スコープで共通。
 * Prisma delegate を動的に引くことで型安全性を一部犠牲にしているが、公開 API は型付けされる。
 */
@Injectable()
export class BoardCoreService {
  constructor(private readonly prisma: PrismaService) {}

  // biome-ignore lint/suspicious/noExplicitAny: Prisma delegate は動的にアクセス
  private delegate(name: string): any {
    // biome-ignore lint/suspicious/noExplicitAny: 動的アクセス
    return (this.prisma as any)[name];
  }

  // ========================================================================
  // Categories
  // ========================================================================

  async findAllCategories(cfg: BoardScopeConfig, scopeId?: string) {
    const where = this.buildScopeWhere(cfg, scopeId, { deletedAt: null });
    const categories = await this.delegate(cfg.categoryDelegate).findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            topics: { where: { publishStatus: "published", deletedAt: null } },
          },
        },
      },
    });

    return (
      categories as Array<{
        id: string;
        name: string;
        description: string | null;
        sortOrder: number;
        allowTopicCreation: boolean;
        createdAt: Date;
        _count: { topics: number };
      }>
    ).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      allowTopicCreation: c.allowTopicCreation,
      topicCount: c._count.topics,
      createdAt: c.createdAt,
    }));
  }

  async createCategory(
    cfg: BoardScopeConfig,
    userId: string,
    dto: CreateCategoryDto,
    scopeId?: string,
  ): Promise<unknown> {
    const data: Record<string, unknown> = {
      name: dto.name,
      description: dto.description,
      sortOrder: dto.sortOrder ?? 0,
      allowTopicCreation: dto.allowTopicCreation ?? true,
      createdByUserId: userId,
    };
    if (cfg.scopeField && scopeId) data[cfg.scopeField] = scopeId;

    return (await this.delegate(cfg.categoryDelegate).create({ data })) as unknown;
  }

  async updateCategory(
    cfg: BoardScopeConfig,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<unknown> {
    const category = await this.delegate(cfg.categoryDelegate).findUnique({
      where: { id, deletedAt: null },
    });
    if (!category) throw notFound("board_category");

    return (await this.delegate(cfg.categoryDelegate).update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.allowTopicCreation !== undefined && {
          allowTopicCreation: dto.allowTopicCreation,
        }),
      },
    })) as unknown;
  }

  async reorderCategories(cfg: BoardScopeConfig, items: { id: string; sortOrder: number }[]) {
    const delegate = this.delegate(cfg.categoryDelegate);
    await this.prisma.$transaction(
      items.map(
        (item) =>
          delegate.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }) as Prisma.PrismaPromise<unknown>,
      ),
    );
  }

  async softDeleteCategory(cfg: BoardScopeConfig, id: string) {
    const category = await this.delegate(cfg.categoryDelegate).findUnique({
      where: { id, deletedAt: null },
    });
    if (!category) throw notFound("board_category");

    await this.delegate(cfg.categoryDelegate).update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ========================================================================
  // Topics
  // ========================================================================

  async findAllTopics(
    cfg: BoardScopeConfig,
    userId: string,
    query: TopicQueryDto,
    scopeId?: string,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // 公開条件は BoardTopicsService.searchByPgroonga と揃える（VISIBILITY.boardTopic）。
    // project / event スコープの BoardTopic 派生モデルも deletedAt / publishStatus を共通で持つため、
    // 同じ条件をそのまま転用できる。
    const where = this.buildScopeWhere(cfg, scopeId, {
      ...VISIBILITY.boardTopic,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    });

    const topicDelegate = this.delegate(cfg.topicDelegate);

    const [topics, total] = await Promise.all([
      topicDelegate.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: TOPIC_INCLUDE,
      }),
      topicDelegate.count({ where }),
    ]);

    const topicList = topics as TopicRaw[];
    const likedSet = await this.fetchLikedSet(
      cfg,
      userId,
      "topic",
      topicList.map((t) => t.id),
    );
    const totalPages = Math.ceil((total as number) / limit);

    return {
      data: topicList.map((t) => this.formatTopic(t, likedSet.has(t.id))),
      meta: {
        total: total as number,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOneTopic(cfg: BoardScopeConfig, userId: string, topicId: string) {
    const topicDelegate = this.delegate(cfg.topicDelegate);
    const topic = (await topicDelegate.findUnique({
      where: { id: topicId, deletedAt: null },
      include: TOPIC_INCLUDE,
    })) as (TopicRaw & { authorUserId: string }) | null;
    if (!topic) throw notFound("board_topic");

    if (topic.publishStatus === "draft" && topic.authorUserId !== userId) {
      throw notFound("board_topic");
    }

    await topicDelegate.update({
      where: { id: topicId },
      data: { viewCount: { increment: 1 } },
    });

    const like = await this.delegate(cfg.likeDelegate).findUnique({
      where: { userId_targetType_targetId: { userId, targetType: "topic", targetId: topicId } },
    });

    return this.formatTopic(topic, !!like, topic.viewCount + 1);
  }

  async createTopic(cfg: BoardScopeConfig, userId: string, dto: CreateTopicDto, scopeId?: string) {
    const data: Record<string, unknown> = {
      title: dto.title,
      body: dto.body,
      categoryId: dto.categoryId,
      authorUserId: userId,
      publishStatus: dto.publishStatus ?? "published",
    };
    if (cfg.scopeField && scopeId) data[cfg.scopeField] = scopeId;

    const topic = (await this.delegate(cfg.topicDelegate).create({
      data,
      include: TOPIC_INCLUDE,
    })) as TopicRaw;

    return this.formatTopic(topic, false);
  }

  async updateTopic(cfg: BoardScopeConfig, userId: string, topicId: string, dto: UpdateTopicDto) {
    await this.findTopicForMutation(cfg, topicId, userId);

    const updated = (await this.delegate(cfg.topicDelegate).update({
      where: { id: topicId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.publishStatus !== undefined && { publishStatus: dto.publishStatus }),
      },
      include: TOPIC_INCLUDE,
    })) as TopicRaw;

    return this.formatTopic(updated, false);
  }

  async reorderTopics(cfg: BoardScopeConfig, items: { id: string; sortOrder: number }[]) {
    const delegate = this.delegate(cfg.topicDelegate);
    await this.prisma.$transaction(
      items.map(
        (item) =>
          delegate.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }) as Prisma.PrismaPromise<unknown>,
      ),
    );
  }

  async softDeleteTopic(cfg: BoardScopeConfig, userId: string, topicId: string) {
    await this.findTopicForMutation(cfg, topicId, userId);

    await this.delegate(cfg.topicDelegate).update({
      where: { id: topicId },
      data: { deletedAt: new Date() },
    });
  }

  async toggleTopicPin(cfg: BoardScopeConfig, topicId: string) {
    const topic = (await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null },
    })) as { id: string; isPinned: boolean } | null;
    if (!topic) throw notFound("board_topic");

    const updated = (await this.delegate(cfg.topicDelegate).update({
      where: { id: topicId },
      data: { isPinned: !topic.isPinned },
    })) as { isPinned: boolean };

    return { isPinned: updated.isPinned };
  }

  // ========================================================================
  // Topic Posts
  // ========================================================================

  async findAllTopicPosts(
    cfg: BoardScopeConfig,
    userId: string,
    topicId: string,
    query: PaginationQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const topic = await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw notFound("board_topic");

    const where = { topicId, deletedAt: null };
    const postDelegate = this.delegate(cfg.topicPostDelegate);

    const [posts, total] = await Promise.all([
      postDelegate.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: POST_INCLUDE,
      }),
      postDelegate.count({ where }),
    ]);

    const postList = posts as PostRaw[];
    const likedSet = await this.fetchLikedSet(
      cfg,
      userId,
      "topic_post",
      postList.map((p) => p.id),
    );
    const totalPages = Math.ceil((total as number) / limit);

    return {
      data: postList.map((p) => this.formatPost(p, likedSet.has(p.id))),
      meta: {
        total: total as number,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async createTopicPost(
    cfg: BoardScopeConfig,
    userId: string,
    topicId: string,
    dto: CreateTopicPostDto,
  ) {
    const topic = await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null, publishStatus: "published" },
    });
    if (!topic) throw notFound("board_topic");

    const [post] = await this.prisma.$transaction([
      this.delegate(cfg.topicPostDelegate).create({
        data: { topicId, authorUserId: userId, body: dto.body },
        include: POST_INCLUDE,
      }) as Prisma.PrismaPromise<PostRaw>,
      this.delegate(cfg.topicDelegate).update({
        where: { id: topicId },
        data: { postCount: { increment: 1 } },
      }) as Prisma.PrismaPromise<unknown>,
    ]);

    return this.formatPost(post, false);
  }

  async updateTopicPost(
    cfg: BoardScopeConfig,
    userId: string,
    postId: string,
    dto: UpdateTopicPostDto,
  ) {
    await this.findPostForMutation(cfg, postId, userId);

    const updated = (await this.delegate(cfg.topicPostDelegate).update({
      where: { id: postId },
      data: { body: dto.body },
      include: POST_INCLUDE,
    })) as PostRaw;

    return this.formatPost(updated, false);
  }

  async softDeleteTopicPost(cfg: BoardScopeConfig, userId: string, postId: string) {
    const post = await this.findPostForMutation(cfg, postId, userId);

    await this.prisma.$transaction([
      this.delegate(cfg.topicPostDelegate).update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      }) as Prisma.PrismaPromise<unknown>,
      this.delegate(cfg.topicDelegate).update({
        where: { id: post.topicId },
        data: { postCount: { decrement: 1 } },
      }) as Prisma.PrismaPromise<unknown>,
    ]);
  }

  // ========================================================================
  // Topic Post Comments
  // ========================================================================

  async findAllTopicPostComments(
    cfg: BoardScopeConfig,
    userId: string,
    postId: string,
    query: PaginationQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const post = await this.delegate(cfg.topicPostDelegate).findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw notFound("board_post");

    const where = { postId, deletedAt: null, parentCommentId: null as string | null };
    const commentDelegate = this.delegate(cfg.topicPostCommentDelegate);

    const [comments, total] = await Promise.all([
      commentDelegate.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          ...COMMENT_INCLUDE,
          childComments: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: COMMENT_INCLUDE,
          },
        },
      }),
      commentDelegate.count({ where }),
    ]);

    const commentList = comments as Array<CommentRaw & { childComments: CommentRaw[] }>;
    const allCommentIds = commentList.flatMap((c) => [c.id, ...c.childComments.map((ch) => ch.id)]);
    const likedSet = await this.fetchLikedSet(cfg, userId, "topic_post_comment", allCommentIds);
    const totalPages = Math.ceil((total as number) / limit);

    return {
      data: commentList.map((c) => ({
        ...this.formatComment(c, likedSet.has(c.id)),
        childComments: c.childComments.map((ch) => this.formatComment(ch, likedSet.has(ch.id))),
      })),
      meta: {
        total: total as number,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async createTopicPostComment(
    cfg: BoardScopeConfig,
    userId: string,
    postId: string,
    dto: CreateTopicPostCommentDto,
  ) {
    const post = await this.delegate(cfg.topicPostDelegate).findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw notFound("board_post");

    if (dto.parentCommentId) {
      const parent = await this.delegate(cfg.topicPostCommentDelegate).findUnique({
        where: { id: dto.parentCommentId, postId, deletedAt: null },
      });
      if (!parent) throw notFound("board_parent_comment");
    }

    const [comment] = await this.prisma.$transaction([
      this.delegate(cfg.topicPostCommentDelegate).create({
        data: {
          postId,
          authorUserId: userId,
          body: dto.body,
          parentCommentId: dto.parentCommentId,
        },
        include: COMMENT_INCLUDE,
      }) as Prisma.PrismaPromise<CommentRaw>,
      this.delegate(cfg.topicPostDelegate).update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }) as Prisma.PrismaPromise<unknown>,
    ]);

    return this.formatComment(comment, false);
  }

  async updateTopicPostComment(
    cfg: BoardScopeConfig,
    userId: string,
    commentId: string,
    dto: UpdateTopicPostCommentDto,
  ) {
    await this.findCommentForMutation(cfg, commentId, userId);

    const updated = (await this.delegate(cfg.topicPostCommentDelegate).update({
      where: { id: commentId },
      data: { body: dto.body },
      include: COMMENT_INCLUDE,
    })) as CommentRaw;

    return this.formatComment(updated, false);
  }

  async softDeleteTopicPostComment(cfg: BoardScopeConfig, userId: string, commentId: string) {
    const comment = await this.findCommentForMutation(cfg, commentId, userId);

    await this.prisma.$transaction([
      this.delegate(cfg.topicPostCommentDelegate).update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      }) as Prisma.PrismaPromise<unknown>,
      this.delegate(cfg.topicPostDelegate).update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }) as Prisma.PrismaPromise<unknown>,
    ]);
  }

  // ========================================================================
  // Likes
  // ========================================================================

  async toggleTopicLike(cfg: BoardScopeConfig, userId: string, topicId: string) {
    const topic = await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw notFound("board_topic");

    return this.toggleLike(cfg, userId, "topic", topicId, cfg.topicDelegate);
  }

  async toggleTopicPostLike(cfg: BoardScopeConfig, userId: string, postId: string) {
    const post = await this.delegate(cfg.topicPostDelegate).findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw notFound("board_post");

    return this.toggleLike(cfg, userId, "topic_post", postId, cfg.topicPostDelegate);
  }

  async toggleTopicPostCommentLike(cfg: BoardScopeConfig, userId: string, commentId: string) {
    const comment = await this.delegate(cfg.topicPostCommentDelegate).findUnique({
      where: { id: commentId, deletedAt: null },
    });
    if (!comment) throw notFound("board_comment");

    return this.toggleLike(
      cfg,
      userId,
      "topic_post_comment",
      commentId,
      cfg.topicPostCommentDelegate,
    );
  }

  private async toggleLike(
    cfg: BoardScopeConfig,
    userId: string,
    targetType: string,
    targetId: string,
    targetDelegate: string,
  ) {
    const likeDelegate = this.delegate(cfg.likeDelegate);
    const existing = (await likeDelegate.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    })) as { id: string } | null;

    if (existing) {
      const [, updated] = await this.prisma.$transaction([
        likeDelegate.delete({ where: { id: existing.id } }) as Prisma.PrismaPromise<unknown>,
        this.delegate(targetDelegate).update({
          where: { id: targetId },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        }) as Prisma.PrismaPromise<{ likeCount: number }>,
      ]);
      return { liked: false, likeCount: updated.likeCount };
    }

    const [, updated] = await this.prisma.$transaction([
      likeDelegate.create({
        data: { userId, targetType, targetId },
      }) as Prisma.PrismaPromise<unknown>,
      this.delegate(targetDelegate).update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      }) as Prisma.PrismaPromise<{ likeCount: number }>,
    ]);
    return { liked: true, likeCount: updated.likeCount };
  }

  // ========================================================================
  // Formatters / Helpers
  // ========================================================================

  private formatTopic(t: TopicRaw, isLiked: boolean, viewCountOverride?: number) {
    return {
      id: t.id,
      title: t.title,
      body: t.body,
      publishStatus: t.publishStatus,
      isPinned: t.isPinned,
      sortOrder: t.sortOrder,
      viewCount: viewCountOverride ?? t.viewCount,
      postCount: t.postCount,
      likeCount: t.likeCount,
      author: formatAuthor(t.author),
      category: t.category,
      isLiked,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private formatPost(p: PostRaw, isLiked: boolean) {
    return {
      id: p.id,
      body: p.body,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      isLiked,
      author: formatAuthor(p.author),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private formatComment(c: CommentRaw, isLiked: boolean) {
    return {
      id: c.id,
      body: c.body,
      likeCount: c.likeCount,
      isLiked,
      author: formatAuthor(c.author),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private async fetchLikedSet(
    cfg: BoardScopeConfig,
    userId: string,
    targetType: "topic" | "topic_post" | "topic_post_comment",
    targetIds: string[],
  ): Promise<Set<string>> {
    if (targetIds.length === 0) return new Set();
    const likes = (await this.delegate(cfg.likeDelegate).findMany({
      where: { userId, targetType, targetId: { in: targetIds } },
      select: { targetId: true },
    })) as Array<{ targetId: string }>;
    return new Set(likes.map((l) => l.targetId));
  }

  private buildScopeWhere(
    cfg: BoardScopeConfig,
    scopeId: string | undefined,
    base: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!cfg.scopeField || !scopeId) return base;
    return { ...base, [cfg.scopeField]: scopeId };
  }

  private async assertOwnerOrAdmin(
    authorUserId: string,
    userId: string,
    resourceKey: "board_topic" | "board_post" | "board_comment",
  ): Promise<void> {
    if (authorUserId === userId) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== "owner" && user?.role !== "admin") {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        HttpStatus.FORBIDDEN,
        errorMessages.forbidden,
        undefined,
        `errors.forbidden_resource.${resourceKey}`,
      );
    }
  }

  private async findTopicForMutation(cfg: BoardScopeConfig, topicId: string, userId: string) {
    const topic = (await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null },
    })) as { id: string; authorUserId: string } | null;
    if (!topic) throw notFound("board_topic");
    await this.assertOwnerOrAdmin(topic.authorUserId, userId, "board_topic");
    return topic;
  }

  private async findPostForMutation(cfg: BoardScopeConfig, postId: string, userId: string) {
    const post = (await this.delegate(cfg.topicPostDelegate).findUnique({
      where: { id: postId, deletedAt: null },
    })) as { id: string; authorUserId: string; topicId: string } | null;
    if (!post) throw notFound("board_post");
    await this.assertOwnerOrAdmin(post.authorUserId, userId, "board_post");
    return post;
  }

  private async findCommentForMutation(cfg: BoardScopeConfig, commentId: string, userId: string) {
    const comment = (await this.delegate(cfg.topicPostCommentDelegate).findUnique({
      where: { id: commentId, deletedAt: null },
    })) as { id: string; authorUserId: string; postId: string } | null;
    if (!comment) throw notFound("board_comment");
    await this.assertOwnerOrAdmin(comment.authorUserId, userId, "board_comment");
    return comment;
  }
}

// ============================================================================
// NotFoundException 用ヘルパ
// ============================================================================
//
// 日本語メッセージは i18n の errors.json で一元管理する。
// 実運用（リクエスト経由）では AllExceptionsFilter が messageKey をもとに
// リソース別の翻訳メッセージに差し替える。
// テスト等 I18nContext が無い環境では errors.not_found.default の generic fallback がそのまま返る。

type NotFoundKey =
  | "board_category"
  | "board_topic"
  | "board_post"
  | "board_comment"
  | "board_parent_comment";

function notFound(key: NotFoundKey): BusinessException {
  return new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    errorMessages.not_found.default,
    undefined,
    `errors.not_found.${key}`,
  );
}
