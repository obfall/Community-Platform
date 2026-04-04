import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateTopicPostCommentDto } from "./dto/create-topic-post-comment.dto";
import type { UpdateTopicPostCommentDto } from "./dto/update-topic-post-comment.dto";
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
export class BoardTopicPostCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, postId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const post = await this.prisma.boardTopicPost.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    const where = { postId, deletedAt: null, parentCommentId: null as string | null };

    const [comments, total] = await Promise.all([
      this.prisma.boardTopicPostComment.findMany({
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
      this.prisma.boardTopicPostComment.count({ where }),
    ]);

    const allCommentIds = comments.flatMap((c) => [c.id, ...c.childComments.map((ch) => ch.id)]);

    const userLikes = await this.prisma.boardLike.findMany({
      where: { userId, targetType: "topic_post_comment", targetId: { in: allCommentIds } },
      select: { targetId: true },
    });
    const likedSet = new Set(userLikes.map((l) => l.targetId));

    const totalPages = Math.ceil(total / limit);

    return {
      data: comments.map((c) => ({
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
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async create(userId: string, postId: string, dto: CreateTopicPostCommentDto) {
    const post = await this.prisma.boardTopicPost.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    if (dto.parentCommentId) {
      const parent = await this.prisma.boardTopicPostComment.findUnique({
        where: { id: dto.parentCommentId, postId, deletedAt: null },
      });
      if (!parent) throw new NotFoundException("返信先コメントが見つかりません");
    }

    const comment = await this.prisma.boardTopicPostComment.create({
      data: {
        postId,
        authorUserId: userId,
        body: dto.body,
        parentCommentId: dto.parentCommentId,
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });

    await this.prisma.boardTopicPost.update({
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

  async update(userId: string, commentId: string, dto: UpdateTopicPostCommentDto) {
    await this.findCommentAndCheckAccess(commentId, userId);

    const updated = await this.prisma.boardTopicPostComment.update({
      where: { id: commentId },
      data: { body: dto.body },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });

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

  async softDelete(userId: string, commentId: string) {
    const comment = await this.findCommentAndCheckAccess(commentId, userId);

    await this.prisma.boardTopicPostComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.boardTopicPost.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });
  }

  private async findCommentAndCheckAccess(commentId: string, userId: string) {
    const comment = await this.prisma.boardTopicPostComment.findUnique({
      where: { id: commentId, deletedAt: null },
    });
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
