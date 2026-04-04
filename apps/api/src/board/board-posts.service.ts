import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreatePostDto } from "./dto/create-post.dto";
import type { UpdatePostDto } from "./dto/update-post.dto";
import type { PostQueryDto } from "./dto/post-query.dto";

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
export class BoardPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: PostQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.status === "my_drafts") {
      where.authorUserId = userId;
      where.publishStatus = "draft";
    } else {
      where.publishStatus = "published";
    }

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.authorId) where.authorUserId = query.authorId;
    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }

    const [posts, total] = await Promise.all([
      this.prisma.boardPost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
          category: { select: { id: true, name: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      }),
      this.prisma.boardPost.count({ where }),
    ]);

    // Check which posts the user has liked
    const postIds = posts.map((p) => p.id);
    const userLikes = await this.prisma.boardLike.findMany({
      where: { userId, targetType: "post", targetId: { in: postIds } },
      select: { targetId: true },
    });
    const likedSet = new Set(userLikes.map((l) => l.targetId));

    const totalPages = Math.ceil(total / limit);

    return {
      data: posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        publishStatus: p.publishStatus,
        isPinned: p.isPinned,
        viewCount: p.viewCount,
        commentCount: p.commentCount,
        likeCount: p.likeCount,
        author: mapAuthor(p.author),
        category: p.category,
        tags: p.tags.map((t) => t.tag),
        isLiked: likedSet.has(p.id),
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

  async findOne(userId: string, postId: string) {
    const post = await this.prisma.boardPost.findUnique({
      where: { id: postId, deletedAt: null },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        attachments: {
          orderBy: { sortOrder: "asc" },
          include: {
            file: { select: { id: true, publicUrl: true, originalName: true } },
          },
        },
      },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    // Draft posts are only visible to the author
    if (post.publishStatus === "draft" && post.authorUserId !== userId) {
      throw new NotFoundException("投稿が見つかりません");
    }

    // Increment view count
    await this.prisma.boardPost.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    // Check if user liked
    const like = await this.prisma.boardLike.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: "post", targetId: postId } },
    });

    return {
      id: post.id,
      title: post.title,
      body: post.body,
      publishStatus: post.publishStatus,
      isPinned: post.isPinned,
      viewCount: post.viewCount + 1,
      commentCount: post.commentCount,
      likeCount: post.likeCount,
      author: mapAuthor(post.author),
      category: post.category,
      tags: post.tags.map((t) => t.tag),
      attachments: post.attachments.map((a) => ({
        id: a.id,
        fileId: a.fileId,
        url: a.file.publicUrl,
        fileName: a.file.originalName,
        sortOrder: a.sortOrder,
      })),
      isLiked: !!like,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  async create(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.boardPost.create({
      data: {
        title: dto.title,
        body: dto.body,
        authorUserId: userId,
        categoryId: dto.categoryId,
        publishStatus: dto.publishStatus ?? "draft",
        viewPermission: dto.viewPermission ?? "all",
        requiredRankId: dto.requiredRankId,
        ...(dto.tagIds?.length && {
          tags: {
            createMany: {
              data: dto.tagIds.map((tagId) => ({ tagId })),
            },
          },
        }),
        ...(dto.fileIds?.length && {
          attachments: {
            createMany: {
              data: dto.fileIds.map((fileId, index) => ({
                fileId,
                sortOrder: index,
              })),
            },
          },
        }),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    });

    return {
      id: post.id,
      title: post.title,
      body: post.body,
      publishStatus: post.publishStatus,
      isPinned: post.isPinned,
      viewCount: post.viewCount,
      commentCount: post.commentCount,
      likeCount: post.likeCount,
      author: mapAuthor(post.author),
      category: post.category,
      tags: post.tags.map((t) => t.tag),
      isLiked: false,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  async update(userId: string, postId: string, dto: UpdatePostDto) {
    await this.findPostAndCheckAccess(postId, userId);

    // Update tags if provided (replace all)
    if (dto.tagIds !== undefined) {
      await this.prisma.boardPostTag.deleteMany({ where: { postId } });
      if (dto.tagIds.length > 0) {
        await this.prisma.boardPostTag.createMany({
          data: dto.tagIds.map((tagId) => ({ postId, tagId })),
        });
      }
    }

    // Update attachments if provided (replace all)
    if (dto.fileIds !== undefined) {
      await this.prisma.boardPostAttachment.deleteMany({ where: { postId } });
      if (dto.fileIds.length > 0) {
        await this.prisma.boardPostAttachment.createMany({
          data: dto.fileIds.map((fileId, index) => ({
            postId,
            fileId,
            sortOrder: index,
          })),
        });
      }
    }

    const updated = await this.prisma.boardPost.update({
      where: { id: postId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.publishStatus !== undefined && { publishStatus: dto.publishStatus }),
        ...(dto.viewPermission !== undefined && { viewPermission: dto.viewPermission }),
        ...(dto.requiredRankId !== undefined && { requiredRankId: dto.requiredRankId }),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      body: updated.body,
      publishStatus: updated.publishStatus,
      isPinned: updated.isPinned,
      viewCount: updated.viewCount,
      commentCount: updated.commentCount,
      likeCount: updated.likeCount,
      author: mapAuthor(updated.author),
      category: updated.category,
      tags: updated.tags.map((t) => t.tag),
      isLiked: false,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async softDelete(userId: string, postId: string) {
    await this.findPostAndCheckAccess(postId, userId);

    await this.prisma.boardPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
  }

  async togglePin(postId: string) {
    const post = await this.prisma.boardPost.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    const updated = await this.prisma.boardPost.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    });

    return { isPinned: updated.isPinned };
  }

  private async findPostAndCheckAccess(postId: string, userId: string) {
    const post = await this.prisma.boardPost.findUnique({
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
