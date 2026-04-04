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

  async toggleTopicLike(userId: string, topicId: string) {
    const topic = await this.prisma.boardTopic.findUnique({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw new NotFoundException("トピックが見つかりません");

    return this.toggle(userId, "topic", topicId);
  }

  async toggleTopicPostLike(userId: string, postId: string) {
    const post = await this.prisma.boardTopicPost.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    return this.toggle(userId, "topic_post", postId);
  }

  async toggleTopicPostCommentLike(userId: string, commentId: string) {
    const comment = await this.prisma.boardTopicPostComment.findUnique({
      where: { id: commentId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException("コメントが見つかりません");

    return this.toggle(userId, "topic_post_comment", commentId);
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
    const model = this.getModel(targetType);
    await (model as { update: (args: unknown) => Promise<unknown> }).update({
      where: { id: targetId },
      data: { likeCount: { increment: 1 } },
    });
  }

  private async decrementLikeCount(targetType: string, targetId: string) {
    const model = this.getModel(targetType);
    await (model as { update: (args: unknown) => Promise<unknown> }).update({
      where: { id: targetId },
      data: { likeCount: { decrement: 1 } },
    });
  }

  private async getLikeCount(targetType: string, targetId: string) {
    const model = this.getModel(targetType);
    const record = await (model as { findUnique: (args: unknown) => Promise<unknown> }).findUnique({
      where: { id: targetId },
      select: { likeCount: true },
    });
    return (record as { likeCount: number } | null)?.likeCount ?? 0;
  }

  private getModel(targetType: string) {
    switch (targetType) {
      case "post":
        return this.prisma.boardPost;
      case "comment":
        return this.prisma.boardComment;
      case "topic":
        return this.prisma.boardTopic;
      case "topic_post":
        return this.prisma.boardTopicPost;
      case "topic_post_comment":
        return this.prisma.boardTopicPostComment;
      default:
        throw new NotFoundException("不正な対象です");
    }
  }
}
