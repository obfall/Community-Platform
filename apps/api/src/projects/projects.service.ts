import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { ProjectQueryDto } from "./dto/project-query.dto";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProjectQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.publishStatus) where.publishStatus = query.publishStatus;
    if (query.search) where.name = { contains: query.search, mode: "insensitive" };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          createdByUser: { select: AUTHOR_SELECT },
          category: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        coverImageUrl: p.coverImageUrl,
        status: p.status,
        publishStatus: p.publishStatus,
        memberCount: p._count.members,
        category: p.category,
        startDate: p.startDate,
        endDate: p.endDate,
        createdBy: {
          id: p.createdByUser.id,
          name: p.createdByUser.name,
          avatarUrl: p.createdByUser.profile?.avatarUrl ?? null,
        },
        createdAt: p.createdAt,
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

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        createdByUser: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
        members: {
          where: { status: "active" },
          include: { user: { select: AUTHOR_SELECT } },
          orderBy: { joinedAt: "asc" },
        },
        tags: { include: { tag: true } },
        _count: { select: { members: true, threads: true, tasks: true } },
      },
    });

    if (!project || project.deletedAt) throw new NotFoundException("プロジェクトが見つかりません");

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      coverImageUrl: project.coverImageUrl,
      status: project.status,
      publishStatus: project.publishStatus,
      inviteToken: project.inviteToken,
      inviteLinkEnabled: project.inviteLinkEnabled,
      startDate: project.startDate,
      endDate: project.endDate,
      category: project.category,
      event: project.event,
      memberCount: project._count.members,
      threadCount: project._count.threads,
      taskCount: project._count.tasks,
      members: project.members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.profile?.avatarUrl ?? null,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      tags: project.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })),
      createdBy: {
        id: project.createdByUser.id,
        name: project.createdByUser.name,
        avatarUrl: project.createdByUser.profile?.avatarUrl ?? null,
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async create(userId: string, dto: CreateProjectDto) {
    const inviteToken = randomBytes(32).toString("hex");

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        categoryId: dto.categoryId,
        eventId: dto.eventId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
        inviteToken,
        createdByUserId: userId,
        members: {
          create: { userId, role: "admin" },
        },
      },
    });

    return this.findOne(project.id);
  }

  async update(
    id: string,
    dto: Partial<CreateProjectDto> & { publishStatus?: string; inviteLinkEnabled?: boolean },
  ) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt)
      throw new NotFoundException("プロジェクトが見つかりません");

    await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.eventId !== undefined && { eventId: dto.eventId }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.publishStatus !== undefined && { publishStatus: dto.publishStatus as any }),
        ...(dto.inviteLinkEnabled !== undefined && { inviteLinkEnabled: dto.inviteLinkEnabled }),
      },
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt)
      throw new NotFoundException("プロジェクトが見つかりません");

    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ========== Members ==========

  async joinByToken(token: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { inviteToken: token, deletedAt: null, inviteLinkEnabled: true },
    });
    if (!project) throw new BadRequestException("無効な招待リンクです");

    const existing = await this.prisma.projectMember.findFirst({
      where: { projectId: project.id, userId, status: "active" },
    });
    if (existing) throw new BadRequestException("既にメンバーです");

    await this.prisma.projectMember.create({
      data: { projectId: project.id, userId, role: "member" },
    });

    return this.findOne(project.id);
  }

  async addMember(projectId: string, userId: string) {
    await this.prisma.projectMember.create({
      data: { projectId, userId, role: "member" },
    });
  }

  async removeMember(projectId: string, userId: string, reason?: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: "active" },
    });
    if (!member) throw new NotFoundException("メンバーが見つかりません");

    await this.prisma.projectMember.update({
      where: { id: member.id },
      data: { status: "removed", removedAt: new Date(), removedReason: reason },
    });
  }

  // ========== Threads ==========

  async getThreads(projectId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [threads, total] = await Promise.all([
      this.prisma.projectThread.findMany({
        where: { projectId, deletedAt: null },
        orderBy: [{ isPinned: "desc" }, { lastReplyAt: { sort: "desc", nulls: "last" } }],
        skip,
        take: limit,
        include: { createdBy: { select: AUTHOR_SELECT } },
      }),
      this.prisma.projectThread.count({ where: { projectId, deletedAt: null } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: threads.map((t) => ({
        id: t.id,
        title: t.title,
        isPinned: t.isPinned,
        replyCount: t.replyCount,
        likeCount: t.likeCount,
        lastReplyAt: t.lastReplyAt,
        createdBy: {
          id: t.createdBy.id,
          name: t.createdBy.name,
          avatarUrl: t.createdBy.profile?.avatarUrl ?? null,
        },
        createdAt: t.createdAt,
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

  async createThread(projectId: string, userId: string, title: string) {
    const thread = await this.prisma.projectThread.create({
      data: { projectId, title, createdByUserId: userId },
      include: { createdBy: { select: AUTHOR_SELECT } },
    });
    return {
      ...thread,
      createdBy: {
        id: thread.createdBy.id,
        name: thread.createdBy.name,
        avatarUrl: thread.createdBy.profile?.avatarUrl ?? null,
      },
    };
  }

  // ========== Replies ==========

  async getReplies(threadId: string) {
    const replies = await this.prisma.projectThreadReply.findMany({
      where: { threadId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: AUTHOR_SELECT } },
    });
    return replies.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      body: r.body,
      likeCount: r.likeCount,
      author: {
        id: r.author.id,
        name: r.author.name,
        avatarUrl: r.author.profile?.avatarUrl ?? null,
      },
      createdAt: r.createdAt,
    }));
  }

  async createReply(threadId: string, userId: string, body: string) {
    const reply = await this.prisma.projectThreadReply.create({
      data: { threadId, authorUserId: userId, body },
      include: { author: { select: AUTHOR_SELECT } },
    });

    // replyCount と lastReplyAt を更新
    await this.prisma.projectThread.update({
      where: { id: threadId },
      data: { replyCount: { increment: 1 }, lastReplyAt: new Date() },
    });

    return {
      id: reply.id,
      threadId: reply.threadId,
      body: reply.body,
      likeCount: reply.likeCount,
      author: {
        id: reply.author.id,
        name: reply.author.name,
        avatarUrl: reply.author.profile?.avatarUrl ?? null,
      },
      createdAt: reply.createdAt,
    };
  }

  // ========== Likes ==========

  async toggleThreadLike(threadId: string, userId: string) {
    const existing = await this.prisma.projectThreadLike.findFirst({
      where: { userId, threadId },
    });

    if (existing) {
      await this.prisma.projectThreadLike.delete({ where: { id: existing.id } });
      await this.prisma.projectThread.update({
        where: { id: threadId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    }

    await this.prisma.projectThreadLike.create({
      data: { userId, threadId },
    });
    await this.prisma.projectThread.update({
      where: { id: threadId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true };
  }

  async toggleReplyLike(replyId: string, userId: string) {
    const existing = await this.prisma.projectThreadLike.findFirst({
      where: { userId, replyId },
    });

    if (existing) {
      await this.prisma.projectThreadLike.delete({ where: { id: existing.id } });
      await this.prisma.projectThreadReply.update({
        where: { id: replyId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    }

    await this.prisma.projectThreadLike.create({
      data: { userId, replyId },
    });
    await this.prisma.projectThreadReply.update({
      where: { id: replyId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true };
  }

  // ========== Tasks ==========

  async getTasks(projectId: string) {
    return this.prisma.projectTask.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        createdBy: { select: AUTHOR_SELECT },
        assignees: { include: { user: { select: AUTHOR_SELECT } } },
      },
    });
  }

  async createTask(
    projectId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      dueDate?: string;
      requestedDate?: string;
      assigneeIds?: string[];
      fileIds?: string[];
    },
  ) {
    const task = await this.prisma.projectTask.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        requestedDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
        createdByUserId: userId,
        ...(data.assigneeIds?.length && {
          assignees: {
            create: data.assigneeIds.map((uid) => ({ userId: uid })),
          },
        }),
        ...(data.fileIds?.length && {
          attachments: {
            create: data.fileIds.map((fileId, i) => ({ fileId, sortOrder: i })),
          },
        }),
      },
      include: {
        createdBy: { select: AUTHOR_SELECT },
        assignees: { include: { user: { select: AUTHOR_SELECT } } },
        attachments: {
          include: { file: { select: { id: true, originalName: true, publicUrl: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return {
      ...task,
      createdBy: {
        id: task.createdBy.id,
        name: task.createdBy.name,
        avatarUrl: task.createdBy.profile?.avatarUrl ?? null,
      },
      assignees: task.assignees.map((a) => ({
        id: a.id,
        userId: a.user.id,
        name: a.user.name,
        avatarUrl: a.user.profile?.avatarUrl ?? null,
      })),
    };
  }

  async updateTask(
    taskId: string,
    data: { title?: string; description?: string; progress?: number; dueDate?: string },
  ) {
    return this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.progress !== undefined && { progress: data.progress }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
      },
    });
  }

  // ========== Board（Phase 2 掲示板と同じ構造） ==========

  private boardScope(projectId: string) {
    return `pb_${projectId}`;
  }

  /** カテゴリ一覧 */
  async getBoardCategories(projectId: string) {
    const categories = await this.prisma.category.findMany({
      where: { scope: this.boardScope(projectId), isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // 各カテゴリのトピック数を取得
    const counts = await Promise.all(
      categories.map((c) =>
        this.prisma.projectBoardPost.count({
          where: { projectId, categoryId: c.id, deletedAt: null },
        }),
      ),
    );

    return categories.map((c, i) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      topicCount: counts[i],
    }));
  }

  /** カテゴリ作成 */
  async createBoardCategory(projectId: string, data: { name: string; description?: string }) {
    const scope = this.boardScope(projectId);
    const slug = `${projectId}-${Date.now()}`;

    return this.prisma.category.create({
      data: {
        scope,
        slug,
        name: data.name,
        description: data.description,
      },
    });
  }

  /** カテゴリ削除 */
  async deleteBoardCategory(categoryId: string) {
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { isActive: false },
    });
  }

  /** トピック一覧（カテゴリでフィルタ可） */
  async getBoardTopics(
    projectId: string,
    query: { page?: number; limit?: number; categoryId?: string },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      projectId,
      deletedAt: null,
      publishStatus: "published",
    };
    if (query.categoryId) where.categoryId = query.categoryId;

    const [topics, total] = await Promise.all([
      this.prisma.projectBoardPost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
          category: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.projectBoardPost.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: topics.map((t) => ({
        id: t.id,
        title: t.title,
        body: t.body,
        publishStatus: t.publishStatus,
        isPinned: t.isPinned,
        viewCount: t.viewCount,
        commentCount: t._count.comments,
        likeCount: t.likeCount,
        category: t.category,
        author: {
          id: t.author.id,
          name: t.author.name,
          avatarUrl: t.author.profile?.avatarUrl ?? null,
        },
        createdAt: t.createdAt,
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

  /** トピック詳細 */
  async getBoardTopic(topicId: string) {
    const topic = await this.prisma.projectBoardPost.findUnique({
      where: { id: topicId },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!topic || topic.deletedAt) throw new NotFoundException("トピックが見つかりません");

    // 閲覧数を更新
    await this.prisma.projectBoardPost.update({
      where: { id: topicId },
      data: { viewCount: { increment: 1 } },
    });

    return {
      id: topic.id,
      title: topic.title,
      body: topic.body,
      publishStatus: topic.publishStatus,
      isPinned: topic.isPinned,
      viewCount: topic.viewCount + 1,
      commentCount: topic._count.comments,
      likeCount: topic.likeCount,
      category: topic.category,
      author: {
        id: topic.author.id,
        name: topic.author.name,
        avatarUrl: topic.author.profile?.avatarUrl ?? null,
      },
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  }

  /** トピック作成 */
  async createBoardTopic(
    projectId: string,
    userId: string,
    data: { title: string; body: string; categoryId?: string; publishStatus?: string },
  ) {
    const topic = await this.prisma.projectBoardPost.create({
      data: {
        projectId,
        title: data.title,
        body: data.body,
        categoryId: data.categoryId,
        authorUserId: userId,
        publishStatus: (data.publishStatus as "draft" | "published") ?? "published",
      },
      include: { author: { select: AUTHOR_SELECT } },
    });
    return {
      id: topic.id,
      title: topic.title,
      body: topic.body,
      author: {
        id: topic.author.id,
        name: topic.author.name,
        avatarUrl: topic.author.profile?.avatarUrl ?? null,
      },
      createdAt: topic.createdAt,
    };
  }

  /** トピック削除 */
  async deleteBoardTopic(topicId: string) {
    await this.prisma.projectBoardPost.update({
      where: { id: topicId },
      data: { deletedAt: new Date() },
    });
  }

  /** 投稿（コメント）一覧 — トピック内の投稿 */
  async getBoardPosts(topicId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { postId: topicId, deletedAt: null, parentCommentId: null as string | null };

    const [posts, total] = await Promise.all([
      this.prisma.projectBoardComment.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
          childComments: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: { author: { select: AUTHOR_SELECT } },
          },
        },
      }),
      this.prisma.projectBoardComment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: posts.map((p) => ({
        id: p.id,
        body: p.body,
        likeCount: p.likeCount,
        author: {
          id: p.author.id,
          name: p.author.name,
          avatarUrl: p.author.profile?.avatarUrl ?? null,
        },
        childComments: p.childComments.map((c) => ({
          id: c.id,
          body: c.body,
          likeCount: c.likeCount,
          author: {
            id: c.author.id,
            name: c.author.name,
            avatarUrl: c.author.profile?.avatarUrl ?? null,
          },
          createdAt: c.createdAt,
        })),
        createdAt: p.createdAt,
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

  /** 投稿作成（トピック内） */
  async createBoardPost(topicId: string, userId: string, body: string) {
    const post = await this.prisma.projectBoardComment.create({
      data: { postId: topicId, authorUserId: userId, body },
      include: { author: { select: AUTHOR_SELECT } },
    });
    await this.prisma.projectBoardPost.update({
      where: { id: topicId },
      data: { commentCount: { increment: 1 } },
    });
    return {
      id: post.id,
      body: post.body,
      likeCount: post.likeCount,
      author: {
        id: post.author.id,
        name: post.author.name,
        avatarUrl: post.author.profile?.avatarUrl ?? null,
      },
      createdAt: post.createdAt,
    };
  }

  /** 返信作成（投稿への返信） */
  async createBoardReply(postId: string, userId: string, body: string) {
    const parent = await this.prisma.projectBoardComment.findUnique({ where: { id: postId } });
    if (!parent) throw new NotFoundException("投稿が見つかりません");

    const reply = await this.prisma.projectBoardComment.create({
      data: {
        postId: parent.postId,
        authorUserId: userId,
        parentCommentId: postId,
        body,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });
    return {
      id: reply.id,
      body: reply.body,
      likeCount: reply.likeCount,
      author: {
        id: reply.author.id,
        name: reply.author.name,
        avatarUrl: reply.author.profile?.avatarUrl ?? null,
      },
      createdAt: reply.createdAt,
    };
  }

  /** 掲示板いいね切替 */
  async toggleBoardLike(targetType: string, targetId: string, userId: string) {
    const existing = await this.prisma.projectBoardLike.findFirst({
      where: { userId, targetType, targetId },
    });

    if (existing) {
      await this.prisma.projectBoardLike.delete({ where: { id: existing.id } });
      if (targetType === "project_board_post") {
        await this.prisma.projectBoardPost.update({
          where: { id: targetId },
          data: { likeCount: { decrement: 1 } },
        });
      } else {
        await this.prisma.projectBoardComment.update({
          where: { id: targetId },
          data: { likeCount: { decrement: 1 } },
        });
      }
      return { liked: false };
    }

    await this.prisma.projectBoardLike.create({
      data: { userId, targetType, targetId },
    });
    if (targetType === "project_board_post") {
      await this.prisma.projectBoardPost.update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
      });
    } else {
      await this.prisma.projectBoardComment.update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
      });
    }
    return { liked: true };
  }
}
