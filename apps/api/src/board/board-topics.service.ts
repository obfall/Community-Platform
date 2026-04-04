import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateTopicDto } from "./dto/create-topic.dto";
import type { UpdateTopicDto } from "./dto/update-topic.dto";
import type { TopicQueryDto } from "./dto/topic-query.dto";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

function mapAuthor(author: {
  id: string;
  name: string;
  profile?: { avatarUrl: string | null } | null;
}) {
  return { id: author.id, name: author.name, avatarUrl: author.profile?.avatarUrl ?? null };
}

@Injectable()
export class BoardTopicsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: TopicQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      publishStatus: "published",
    };

    if (query.categoryId) where.categoryId = query.categoryId;

    const [topics, total] = await Promise.all([
      this.prisma.boardTopic.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.boardTopic.count({ where }),
    ]);

    const topicIds = topics.map((t) => t.id);
    const userLikes = await this.prisma.boardLike.findMany({
      where: { userId, targetType: "topic", targetId: { in: topicIds } },
      select: { targetId: true },
    });
    const likedSet = new Set(userLikes.map((l) => l.targetId));

    const totalPages = Math.ceil(total / limit);

    return {
      data: topics.map((t) => ({
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
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(userId: string, topicId: string) {
    const topic = await this.prisma.boardTopic.findUnique({
      where: { id: topicId, deletedAt: null },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
      },
    });
    if (!topic) throw new NotFoundException("トピックが見つかりません");

    if (topic.publishStatus === "draft" && topic.authorUserId !== userId) {
      throw new NotFoundException("トピックが見つかりません");
    }

    await this.prisma.boardTopic.update({
      where: { id: topicId },
      data: { viewCount: { increment: 1 } },
    });

    const like = await this.prisma.boardLike.findUnique({
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

  async create(userId: string, dto: CreateTopicDto) {
    const topic = await this.prisma.boardTopic.create({
      data: {
        title: dto.title,
        body: dto.body,
        categoryId: dto.categoryId,
        authorUserId: userId,
        publishStatus: dto.publishStatus ?? "published",
      },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
      },
    });

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

  async update(userId: string, topicId: string, dto: UpdateTopicDto) {
    await this.findTopicAndCheckAccess(topicId, userId);

    const updated = await this.prisma.boardTopic.update({
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
    });

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

  async reorder(items: { id: string; sortOrder: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.boardTopic.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  async softDelete(userId: string, topicId: string) {
    await this.findTopicAndCheckAccess(topicId, userId);

    await this.prisma.boardTopic.update({
      where: { id: topicId },
      data: { deletedAt: new Date() },
    });
  }

  async togglePin(topicId: string) {
    const topic = await this.prisma.boardTopic.findUnique({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw new NotFoundException("トピックが見つかりません");

    const updated = await this.prisma.boardTopic.update({
      where: { id: topicId },
      data: { isPinned: !topic.isPinned },
    });

    return { isPinned: updated.isPinned };
  }

  private async findTopicAndCheckAccess(topicId: string, userId: string) {
    const topic = await this.prisma.boardTopic.findUnique({
      where: { id: topicId, deletedAt: null },
    });
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
}
