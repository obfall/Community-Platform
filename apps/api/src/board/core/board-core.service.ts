import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
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

const AUTHOR_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

type AuthorLike = {
  id: string;
  name: string;
  profile?: { avatarUrl: string | null } | null;
};

function mapAuthor(author: AuthorLike) {
  return { id: author.id, name: author.name, avatarUrl: author.profile?.avatarUrl ?? null };
}

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
  ) {
    const data: Record<string, unknown> = {
      name: dto.name,
      description: dto.description,
      sortOrder: dto.sortOrder ?? 0,
      allowTopicCreation: dto.allowTopicCreation ?? true,
      createdByUserId: userId,
    };
    if (cfg.scopeField && scopeId) data[cfg.scopeField] = scopeId;

    return this.delegate(cfg.categoryDelegate).create({ data });
  }

  async updateCategory(cfg: BoardScopeConfig, id: string, dto: UpdateCategoryDto) {
    const category = await this.delegate(cfg.categoryDelegate).findUnique({
      where: { id, deletedAt: null },
    });
    if (!category) throw new NotFoundException("カテゴリが見つかりません");

    return this.delegate(cfg.categoryDelegate).update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.allowTopicCreation !== undefined && {
          allowTopicCreation: dto.allowTopicCreation,
        }),
      },
    });
  }

  async reorderCategories(cfg: BoardScopeConfig, items: { id: string; sortOrder: number }[]) {
    const delegate = this.delegate(cfg.categoryDelegate);
    await this.prisma.$transaction(
      items.map((item) =>
        delegate.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  async softDeleteCategory(cfg: BoardScopeConfig, id: string) {
    const category = await this.delegate(cfg.categoryDelegate).findUnique({
      where: { id, deletedAt: null },
    });
    if (!category) throw new NotFoundException("カテゴリが見つかりません");

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

    const where = this.buildScopeWhere(cfg, scopeId, {
      deletedAt: null,
      publishStatus: "published",
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    });

    const topicDelegate = this.delegate(cfg.topicDelegate);

    const [topics, total] = await Promise.all([
      topicDelegate.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
          category: { select: { id: true, name: true } },
        },
      }),
      topicDelegate.count({ where }),
    ]);

    const topicList = topics as Array<{
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
    }>;

    const topicIds = topicList.map((t) => t.id);
    const userLikes = await this.delegate(cfg.likeDelegate).findMany({
      where: { userId, targetType: "topic", targetId: { in: topicIds } },
      select: { targetId: true },
    });
    const likedSet = new Set((userLikes as Array<{ targetId: string }>).map((l) => l.targetId));

    const totalPages = Math.ceil((total as number) / limit);

    return {
      data: topicList.map((t) => ({
        id: t.id,
        title: t.title,
        body: t.body,
        publishStatus: t.publishStatus,
        isPinned: t.isPinned,
        sortOrder: t.sortOrder,
        viewCount: t.viewCount,
        postCount: t.postCount,
        likeCount: t.likeCount,
        author: mapAuthor(t.author),
        category: t.category,
        isLiked: likedSet.has(t.id),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
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

  async findOneTopic(cfg: BoardScopeConfig, userId: string, topicId: string) {
    const topicDelegate = this.delegate(cfg.topicDelegate);
    const topic = (await topicDelegate.findUnique({
      where: { id: topicId, deletedAt: null },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
      },
    })) as {
      id: string;
      title: string;
      body: string;
      publishStatus: string;
      isPinned: boolean;
      sortOrder: number;
      viewCount: number;
      postCount: number;
      likeCount: number;
      authorUserId: string;
      author: AuthorLike;
      category: { id: string; name: string };
      createdAt: Date;
      updatedAt: Date;
    } | null;
    if (!topic) throw new NotFoundException("トピックが見つかりません");

    if (topic.publishStatus === "draft" && topic.authorUserId !== userId) {
      throw new NotFoundException("トピックが見つかりません");
    }

    await topicDelegate.update({
      where: { id: topicId },
      data: { viewCount: { increment: 1 } },
    });

    const like = await this.delegate(cfg.likeDelegate).findUnique({
      where: { userId_targetType_targetId: { userId, targetType: "topic", targetId: topicId } },
    });

    return {
      id: topic.id,
      title: topic.title,
      body: topic.body,
      publishStatus: topic.publishStatus,
      isPinned: topic.isPinned,
      sortOrder: topic.sortOrder,
      viewCount: topic.viewCount + 1,
      postCount: topic.postCount,
      likeCount: topic.likeCount,
      author: mapAuthor(topic.author),
      category: topic.category,
      isLiked: !!like,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
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
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
      },
    })) as {
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

    return {
      id: topic.id,
      title: topic.title,
      body: topic.body,
      publishStatus: topic.publishStatus,
      isPinned: topic.isPinned,
      sortOrder: topic.sortOrder,
      viewCount: topic.viewCount,
      postCount: topic.postCount,
      likeCount: topic.likeCount,
      author: mapAuthor(topic.author),
      category: topic.category,
      isLiked: false,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  }

  async updateTopic(cfg: BoardScopeConfig, userId: string, topicId: string, dto: UpdateTopicDto) {
    await this.findTopicAndCheckAccess(cfg, topicId, userId);

    const updated = (await this.delegate(cfg.topicDelegate).update({
      where: { id: topicId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.publishStatus !== undefined && { publishStatus: dto.publishStatus }),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
      },
    })) as {
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

    return {
      id: updated.id,
      title: updated.title,
      body: updated.body,
      publishStatus: updated.publishStatus,
      isPinned: updated.isPinned,
      sortOrder: updated.sortOrder,
      viewCount: updated.viewCount,
      postCount: updated.postCount,
      likeCount: updated.likeCount,
      author: mapAuthor(updated.author),
      category: updated.category,
      isLiked: false,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async reorderTopics(cfg: BoardScopeConfig, items: { id: string; sortOrder: number }[]) {
    const delegate = this.delegate(cfg.topicDelegate);
    await this.prisma.$transaction(
      items.map((item) =>
        delegate.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  async softDeleteTopic(cfg: BoardScopeConfig, userId: string, topicId: string) {
    await this.findTopicAndCheckAccess(cfg, topicId, userId);

    await this.delegate(cfg.topicDelegate).update({
      where: { id: topicId },
      data: { deletedAt: new Date() },
    });
  }

  async toggleTopicPin(cfg: BoardScopeConfig, topicId: string) {
    const topic = (await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null },
    })) as { id: string; isPinned: boolean } | null;
    if (!topic) throw new NotFoundException("トピックが見つかりません");

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
    if (!topic) throw new NotFoundException("トピックが見つかりません");

    const where = { topicId, deletedAt: null };
    const postDelegate = this.delegate(cfg.topicPostDelegate);

    const [posts, total] = await Promise.all([
      postDelegate.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
        },
      }),
      postDelegate.count({ where }),
    ]);

    const postList = posts as Array<{
      id: string;
      body: string;
      likeCount: number;
      commentCount: number;
      author: AuthorLike;
      createdAt: Date;
      updatedAt: Date;
    }>;

    const postIds = postList.map((p) => p.id);

    const userLikes = await this.delegate(cfg.likeDelegate).findMany({
      where: { userId, targetType: "topic_post", targetId: { in: postIds } },
      select: { targetId: true },
    });
    const likedSet = new Set((userLikes as Array<{ targetId: string }>).map((l) => l.targetId));

    const totalPages = Math.ceil((total as number) / limit);

    return {
      data: postList.map((p) => ({
        id: p.id,
        body: p.body,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        isLiked: likedSet.has(p.id),
        author: mapAuthor(p.author),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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

  async createTopicPost(
    cfg: BoardScopeConfig,
    userId: string,
    topicId: string,
    dto: CreateTopicPostDto,
  ) {
    const topic = await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null, publishStatus: "published" },
    });
    if (!topic) throw new NotFoundException("トピックが見つかりません");

    const post = (await this.delegate(cfg.topicPostDelegate).create({
      data: {
        topicId,
        authorUserId: userId,
        body: dto.body,
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    })) as {
      id: string;
      body: string;
      likeCount: number;
      commentCount: number;
      author: AuthorLike;
      createdAt: Date;
      updatedAt: Date;
    };

    await this.delegate(cfg.topicDelegate).update({
      where: { id: topicId },
      data: { postCount: { increment: 1 } },
    });

    return {
      id: post.id,
      body: post.body,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLiked: false,
      author: mapAuthor(post.author),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  async updateTopicPost(
    cfg: BoardScopeConfig,
    userId: string,
    postId: string,
    dto: UpdateTopicPostDto,
  ) {
    await this.findPostAndCheckAccess(cfg, postId, userId);

    const updated = (await this.delegate(cfg.topicPostDelegate).update({
      where: { id: postId },
      data: { body: dto.body },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    })) as {
      id: string;
      body: string;
      likeCount: number;
      commentCount: number;
      author: AuthorLike;
      createdAt: Date;
      updatedAt: Date;
    };

    return {
      id: updated.id,
      body: updated.body,
      likeCount: updated.likeCount,
      commentCount: updated.commentCount,
      isLiked: false,
      author: mapAuthor(updated.author),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async softDeleteTopicPost(cfg: BoardScopeConfig, userId: string, postId: string) {
    const post = await this.findPostAndCheckAccess(cfg, postId, userId);

    await this.delegate(cfg.topicPostDelegate).update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    await this.delegate(cfg.topicDelegate).update({
      where: { id: post.topicId },
      data: { postCount: { decrement: 1 } },
    });
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
    if (!post) throw new NotFoundException("投稿が見つかりません");

    const where = { postId, deletedAt: null, parentCommentId: null as string | null };
    const commentDelegate = this.delegate(cfg.topicPostCommentDelegate);

    const [comments, total] = await Promise.all([
      commentDelegate.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
          childComments: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: AUTHOR_SELECT },
            },
          },
        },
      }),
      commentDelegate.count({ where }),
    ]);

    const commentList = comments as Array<{
      id: string;
      body: string;
      likeCount: number;
      author: AuthorLike;
      createdAt: Date;
      updatedAt: Date;
      childComments: Array<{
        id: string;
        body: string;
        likeCount: number;
        author: AuthorLike;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }>;

    const allCommentIds = commentList.flatMap((c) => [c.id, ...c.childComments.map((ch) => ch.id)]);

    const userLikes = await this.delegate(cfg.likeDelegate).findMany({
      where: { userId, targetType: "topic_post_comment", targetId: { in: allCommentIds } },
      select: { targetId: true },
    });
    const likedSet = new Set((userLikes as Array<{ targetId: string }>).map((l) => l.targetId));

    const totalPages = Math.ceil((total as number) / limit);

    return {
      data: commentList.map((c) => ({
        id: c.id,
        body: c.body,
        likeCount: c.likeCount,
        isLiked: likedSet.has(c.id),
        author: mapAuthor(c.author),
        childComments: c.childComments.map((ch) => ({
          id: ch.id,
          body: ch.body,
          likeCount: ch.likeCount,
          isLiked: likedSet.has(ch.id),
          author: mapAuthor(ch.author),
          createdAt: ch.createdAt,
          updatedAt: ch.updatedAt,
        })),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
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
    if (!post) throw new NotFoundException("投稿が見つかりません");

    if (dto.parentCommentId) {
      const parent = await this.delegate(cfg.topicPostCommentDelegate).findUnique({
        where: { id: dto.parentCommentId, postId, deletedAt: null },
      });
      if (!parent) throw new NotFoundException("返信先コメントが見つかりません");
    }

    const comment = (await this.delegate(cfg.topicPostCommentDelegate).create({
      data: {
        postId,
        authorUserId: userId,
        body: dto.body,
        parentCommentId: dto.parentCommentId,
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    })) as {
      id: string;
      body: string;
      likeCount: number;
      author: AuthorLike;
      createdAt: Date;
      updatedAt: Date;
    };

    await this.delegate(cfg.topicPostDelegate).update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    return {
      id: comment.id,
      body: comment.body,
      likeCount: comment.likeCount,
      isLiked: false,
      author: mapAuthor(comment.author),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  async updateTopicPostComment(
    cfg: BoardScopeConfig,
    userId: string,
    commentId: string,
    dto: UpdateTopicPostCommentDto,
  ) {
    await this.findCommentAndCheckAccess(cfg, commentId, userId);

    const updated = (await this.delegate(cfg.topicPostCommentDelegate).update({
      where: { id: commentId },
      data: { body: dto.body },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    })) as {
      id: string;
      body: string;
      likeCount: number;
      author: AuthorLike;
      createdAt: Date;
      updatedAt: Date;
    };

    return {
      id: updated.id,
      body: updated.body,
      likeCount: updated.likeCount,
      isLiked: false,
      author: mapAuthor(updated.author),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async softDeleteTopicPostComment(cfg: BoardScopeConfig, userId: string, commentId: string) {
    const comment = await this.findCommentAndCheckAccess(cfg, commentId, userId);

    await this.delegate(cfg.topicPostCommentDelegate).update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    await this.delegate(cfg.topicPostDelegate).update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });
  }

  // ========================================================================
  // Likes
  // ========================================================================

  async toggleTopicLike(cfg: BoardScopeConfig, userId: string, topicId: string) {
    const topic = await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw new NotFoundException("トピックが見つかりません");

    return this.toggleLike(cfg, userId, "topic", topicId, cfg.topicDelegate);
  }

  async toggleTopicPostLike(cfg: BoardScopeConfig, userId: string, postId: string) {
    const post = await this.delegate(cfg.topicPostDelegate).findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    return this.toggleLike(cfg, userId, "topic_post", postId, cfg.topicPostDelegate);
  }

  async toggleTopicPostCommentLike(cfg: BoardScopeConfig, userId: string, commentId: string) {
    const comment = await this.delegate(cfg.topicPostCommentDelegate).findUnique({
      where: { id: commentId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException("コメントが見つかりません");

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
    const existing = await likeDelegate.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    });

    if (existing) {
      await likeDelegate.delete({ where: { id: existing.id } });
      await this.delegate(targetDelegate).update({
        where: { id: targetId },
        data: { likeCount: { decrement: 1 } },
      });

      const updated = (await this.delegate(targetDelegate).findUnique({
        where: { id: targetId },
        select: { likeCount: true },
      })) as { likeCount: number } | null;
      return { liked: false, likeCount: updated?.likeCount ?? 0 };
    }

    await likeDelegate.create({ data: { userId, targetType, targetId } });
    await this.delegate(targetDelegate).update({
      where: { id: targetId },
      data: { likeCount: { increment: 1 } },
    });

    const updated = (await this.delegate(targetDelegate).findUnique({
      where: { id: targetId },
      select: { likeCount: true },
    })) as { likeCount: number } | null;
    return { liked: true, likeCount: updated?.likeCount ?? 0 };
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private buildScopeWhere(
    cfg: BoardScopeConfig,
    scopeId: string | undefined,
    base: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!cfg.scopeField || !scopeId) return base;
    return { ...base, [cfg.scopeField]: scopeId };
  }

  private async findTopicAndCheckAccess(cfg: BoardScopeConfig, topicId: string, userId: string) {
    const topic = (await this.delegate(cfg.topicDelegate).findUnique({
      where: { id: topicId, deletedAt: null },
    })) as { id: string; authorUserId: string } | null;
    if (!topic) throw new NotFoundException("トピックが見つかりません");

    if (topic.authorUserId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== "owner" && user?.role !== "admin") {
        throw new ForbiddenException("このトピックを操作する権限がありません");
      }
    }

    return topic;
  }

  private async findPostAndCheckAccess(cfg: BoardScopeConfig, postId: string, userId: string) {
    const post = (await this.delegate(cfg.topicPostDelegate).findUnique({
      where: { id: postId, deletedAt: null },
    })) as { id: string; authorUserId: string; topicId: string } | null;
    if (!post) throw new NotFoundException("投稿が見つかりません");

    if (post.authorUserId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== "owner" && user?.role !== "admin") {
        throw new ForbiddenException("この投稿を操作する権限がありません");
      }
    }

    return post;
  }

  private async findCommentAndCheckAccess(
    cfg: BoardScopeConfig,
    commentId: string,
    userId: string,
  ) {
    const comment = (await this.delegate(cfg.topicPostCommentDelegate).findUnique({
      where: { id: commentId, deletedAt: null },
    })) as { id: string; authorUserId: string; postId: string } | null;
    if (!comment) throw new NotFoundException("コメントが見つかりません");

    if (comment.authorUserId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== "owner" && user?.role !== "admin") {
        throw new ForbiddenException("このコメントを操作する権限がありません");
      }
    }

    return comment;
  }
}
