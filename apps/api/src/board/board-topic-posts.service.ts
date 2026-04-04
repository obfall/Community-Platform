import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateTopicPostDto } from "./dto/create-topic-post.dto";
import type { UpdateTopicPostDto } from "./dto/update-topic-post.dto";
import type { PaginationQueryDto } from "@/common/dto/pagination.dto";

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
export class BoardTopicPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, topicId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const topic = await this.prisma.boardTopic.findUnique({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw new NotFoundException("トピックが見つかりま���ん");

    const where = { topicId, deletedAt: null };

    const [posts, total] = await Promise.all([
      this.prisma.boardTopicPost.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
        },
      }),
      this.prisma.boardTopicPost.count({ where }),
    ]);

    const postIds = posts.map((p) => p.id);

    const userLikes = await this.prisma.boardLike.findMany({
      where: { userId, targetType: "topic_post", targetId: { in: postIds } },
      select: { targetId: true },
    });
    const likedSet = new Set(userLikes.map((l) => l.targetId));

    const totalPages = Math.ceil(total / limit);

    return {
      data: posts.map((p) => ({
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
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async create(userId: string, topicId: string, dto: CreateTopicPostDto) {
    const topic = await this.prisma.boardTopic.findUnique({
      where: { id: topicId, deletedAt: null, publishStatus: "published" },
    });
    if (!topic) throw new NotFoundException("トピック���見つかりません");

    const post = await this.prisma.boardTopicPost.create({
      data: {
        topicId,
        authorUserId: userId,
        body: dto.body,
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });

    await this.prisma.boardTopic.update({
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

  async update(userId: string, postId: string, dto: UpdateTopicPostDto) {
    await this.findPostAndCheckAccess(postId, userId);

    const updated = await this.prisma.boardTopicPost.update({
      where: { id: postId },
      data: { body: dto.body },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });

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

  async softDelete(userId: string, postId: string) {
    const post = await this.findPostAndCheckAccess(postId, userId);

    await this.prisma.boardTopicPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.boardTopic.update({
      where: { id: post.topicId },
      data: { postCount: { decrement: 1 } },
    });
  }

  private async findPostAndCheckAccess(postId: string, userId: string) {
    const post = await this.prisma.boardTopicPost.findUnique({
      where: { id: postId, deletedAt: null },
    });
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
}
