import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class BoardLikesService {
  constructor(private readonly prisma: PrismaService) {}

  async togglePostLike(userId: string, postId: string) {
    const post = await this.prisma.boardPost.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    return this.toggle(userId, "post", postId);
  }

  async toggleCommentLike(userId: string, commentId: string) {
    const comment = await this.prisma.boardComment.findUnique({
      where: { id: commentId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException("コメントが見つかりません");

    return this.toggle(userId, "comment", commentId);
  }

  private async toggle(userId: string, targetType: string, targetId: string) {
    const existing = await this.prisma.boardLike.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    });

    if (existing) {
      // Remove like
      await this.prisma.boardLike.delete({
        where: { id: existing.id },
      });
      await this.decrementLikeCount(targetType, targetId);

      const likeCount = await this.getLikeCount(targetType, targetId);
      return { liked: false, likeCount };
    } else {
      // Add like
      await this.prisma.boardLike.create({
        data: { userId, targetType, targetId },
      });
      await this.incrementLikeCount(targetType, targetId);

      const likeCount = await this.getLikeCount(targetType, targetId);
      return { liked: true, likeCount };
    }
  }

  private async incrementLikeCount(targetType: string, targetId: string) {
    if (targetType === "post") {
      await this.prisma.boardPost.update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
      });
    } else {
      await this.prisma.boardComment.update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
      });
    }
  }

  private async decrementLikeCount(targetType: string, targetId: string) {
    if (targetType === "post") {
      await this.prisma.boardPost.update({
        where: { id: targetId },
        data: { likeCount: { decrement: 1 } },
      });
    } else {
      await this.prisma.boardComment.update({
        where: { id: targetId },
        data: { likeCount: { decrement: 1 } },
      });
    }
  }

  private async getLikeCount(targetType: string, targetId: string) {
    if (targetType === "post") {
      const post = await this.prisma.boardPost.findUnique({
        where: { id: targetId },
        select: { likeCount: true },
      });
      return post?.likeCount ?? 0;
    } else {
      const comment = await this.prisma.boardComment.findUnique({
        where: { id: targetId },
        select: { likeCount: true },
      });
      return comment?.likeCount ?? 0;
    }
  }
}
