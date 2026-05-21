import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import {
  AUTHOR_SELECT,
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  formatAuthor,
  pgroongaSearchAndFetch,
} from "@/common/utils";
import { Prisma, ProjectStatus } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { ProjectQueryDto } from "./dto/project-query.dto";

/** admin / owner は全ステータス参照可。それ以外は cancelled / completed を一覧から除外。 */
const canViewAllProjectStatuses = (role: UserRole): boolean => role === "admin" || role === "owner";

/** 非管理者の一覧から隠すステータス（中止・終了は閲覧不要のため非表示）。 */
const HIDDEN_STATUSES_FOR_MEMBER: ProjectStatus[] = [
  ProjectStatus.cancelled,
  ProjectStatus.completed,
];

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProjectQueryDto, role: UserRole, userId: string) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped, role, userId);
    }
    return this.findAllStandard(query, role, userId);
  }

  private async findAllStandard(query: ProjectQueryDto, role: UserRole, userId: string) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.ProjectWhereInput = { deletedAt: null };
    if (canViewAllProjectStatuses(role)) {
      if (query.status) where.status = query.status;
    } else if (query.status && HIDDEN_STATUSES_FOR_MEMBER.includes(query.status)) {
      // 非管理者: cancelled / completed を指定したときは「自分が参加中のもの」に限定
      where.status = query.status;
      where.members = { some: { userId, status: "active" } };
    } else if (query.status) {
      // 非管理者: それ以外のステータス指定は尊重する
      where.status = query.status;
    } else {
      // 非管理者: 未指定なら「自分が参加中」 OR 「終了/中止以外」
      where.OR = [
        { members: { some: { userId, status: "active" } } },
        { status: { notIn: HIDDEN_STATUSES_FOR_MEMBER } },
      ];
    }
    if (query.tagId) where.tags = { some: { tagId: query.tagId } };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: this.projectListInclude(),
      }),
      this.prisma.project.count({ where }),
    ]);

    return this.formatProjectList(projects, total, page, limit);
  }

  /**
   * pgroonga による全文検索版。検索条件は通常一覧と一致させる。
   * 非管理者は cancelled/completed を除外するが、自分が参加中のプロジェクトは表示する。
   */
  private async searchByPgroonga(
    query: ProjectQueryDto,
    escaped: string,
    role: UserRole,
    userId: string,
  ) {
    const { page, limit, offset } = extractPagination(query);

    const canViewAll = canViewAllProjectStatuses(role);
    const isHiddenStatus = !!query.status && HIDDEN_STATUSES_FOR_MEMBER.includes(query.status);

    // 自分が参加中のプロジェクトを示す EXISTS 句（非管理者の閲覧解除に使う）
    const memberExists = Prisma.sql`EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ${userId}::uuid AND pm.status = 'active')`;

    // status 条件の組み立て
    let statusClause: Prisma.Sql = Prisma.empty;
    if (canViewAll) {
      if (query.status) {
        statusClause = Prisma.sql`AND status = ${query.status}::"ProjectStatus"`;
      }
    } else if (isHiddenStatus) {
      // cancelled / completed 指定: 自分が参加中のもの限定
      statusClause = Prisma.sql`AND status = ${query.status}::"ProjectStatus" AND ${memberExists}`;
    } else if (query.status) {
      statusClause = Prisma.sql`AND status = ${query.status}::"ProjectStatus"`;
    } else {
      // 未指定: 「自分が参加中」 OR 「終了/中止以外」
      statusClause = Prisma.sql`AND (${memberExists} OR status NOT IN ('cancelled'::"ProjectStatus", 'completed'::"ProjectStatus"))`;
    }

    const where = Prisma.sql`
      deleted_at IS NULL
      ${statusClause}
      ${query.tagId ? Prisma.sql`AND EXISTS (SELECT 1 FROM project_tags pt WHERE pt.project_id = projects.id AND pt.tag_id = ${query.tagId}::uuid)` : Prisma.empty}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "projects",
      searchColumns: ["name", "description", "tags_text"],
      titleColumn: "name",
      snippetColumn: "description",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.project.findMany({
          where: { id: { in: ids }, deletedAt: null },
          include: this.projectListInclude(),
        }),
    });

    return this.formatProjectList(records, total, page, limit, hitsById);
  }

  private projectListInclude() {
    return {
      createdByUser: { select: AUTHOR_SELECT },
      category: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      _count: { select: { members: true } },
    } satisfies Prisma.ProjectInclude;
  }

  private formatProjectList(
    projects: Array<
      Prisma.ProjectGetPayload<{
        include: {
          createdByUser: { select: typeof AUTHOR_SELECT };
          category: { select: { id: true; name: true } };
          tags: { include: { tag: true } };
          _count: { select: { members: true } };
        };
      }>
    >,
    total: number,
    page: number,
    limit: number,
    hitsById?: Map<string, { titleHighlighted: string; snippetHighlighted: string }>,
  ) {
    return {
      data: projects.map((p) => {
        const h = hitsById?.get(p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          titleHighlighted: h?.titleHighlighted,
          snippetHighlighted: h?.snippetHighlighted,
          coverImageUrl: p.coverImageUrl,
          status: p.status,
          memberCount: p._count.members,
          category: p.category,
          tags: p.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })),
          startDate: p.startDate,
          endDate: p.endDate,
          createdBy: formatAuthor(p.createdByUser),
          createdAt: p.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
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
          include: {
            user: {
              select: {
                ...AUTHOR_SELECT,
                profile: {
                  select: { avatarUrl: true, occupation: true },
                },
              },
            },
          },
          // ProjectMemberRole enum は admin → member の順。role asc でホスト→メンバーの順に並ぶ
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
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
        occupation: m.user.profile?.occupation ?? null,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      tags: project.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })),
      createdBy: formatAuthor(project.createdByUser),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async create(userId: string, dto: CreateProjectDto) {
    const inviteToken = randomBytes(32).toString("hex");

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
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

      if (dto.tags && dto.tags.length > 0) {
        await this.syncProjectTags(tx, created.id, dto.tags);
      }

      return created;
    });

    return this.findOne(project.id);
  }

  async update(
    id: string,
    dto: Partial<CreateProjectDto> & { inviteLinkEnabled?: boolean },
    actorId: string,
    actorRole: UserRole,
  ) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt)
      throw new NotFoundException("プロジェクトが見つかりません");

    await this.assertCanManageProjectMembers(id, actorId, actorRole);

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
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
          ...(dto.inviteLinkEnabled !== undefined && { inviteLinkEnabled: dto.inviteLinkEnabled }),
        },
      });

      // tags: undefined なら変更なし、配列なら全件置換（空配列は全削除 + tags_text='' に同期）
      if (dto.tags !== undefined) {
        await this.syncProjectTags(tx, id, dto.tags);
      }
    });

    return this.findOne(id);
  }

  async remove(id: string, actorId: string, actorRole: UserRole) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt)
      throw new NotFoundException("プロジェクトが見つかりません");

    await this.assertCanManageProjectMembers(id, actorId, actorRole);

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

  async addMember(
    projectId: string,
    userId: string,
    role: "admin" | "member" = "member",
    actorId: string,
    actorRole: UserRole,
  ) {
    await this.assertCanManageProjectMembers(projectId, actorId, actorRole);
    await this.prisma.projectMember.create({
      data: { projectId, userId, role },
    });
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: "admin" | "member",
    actorId: string,
    actorRole: UserRole,
  ) {
    await this.assertCanManageProjectMembers(projectId, actorId, actorRole);
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: "active" },
    });
    if (!member) throw new NotFoundException("メンバーが見つかりません");

    await this.prisma.projectMember.update({ where: { id: member.id }, data: { role } });
  }

  async removeMember(
    projectId: string,
    userId: string,
    reason: string | undefined,
    actorId: string,
    actorRole: UserRole,
  ) {
    await this.assertCanManageProjectMembers(projectId, actorId, actorRole);
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: "active" },
    });
    if (!member) throw new NotFoundException("メンバーが見つかりません");

    await this.prisma.projectMember.update({
      where: { id: member.id },
      data: { status: "removed", removedAt: new Date(), removedReason: reason },
    });
  }

  /**
   * メンバー管理（追加・ロール変更・削除）の権限チェック。
   * - システムロール admin / owner: 常に許可
   * - それ以外: 対象プロジェクトの active な ProjectMember で role=admin（ホスト）なら許可
   */
  private async assertCanManageProjectMembers(
    projectId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<void> {
    if (actorRole === "admin" || actorRole === "owner") return;

    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId: actorId, status: "active", role: "admin" },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException("このプロジェクトのメンバー管理権限がありません");
    }
  }

  // ========== Threads ==========

  async getThreads(projectId: string, query: { page?: number; limit?: number }, userId: string) {
    const { page, limit, skip } = extractPagination(query);

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

    // 取得した thread の中で、自分が like しているものの集合を作る
    const threadIds = threads.map((t) => t.id);
    const likedThreads =
      threadIds.length > 0
        ? await this.prisma.projectThreadLike.findMany({
            where: { userId, threadId: { in: threadIds } },
            select: { threadId: true },
          })
        : [];
    const likedSet = new Set(likedThreads.map((l) => l.threadId));

    return {
      data: threads.map((t) => ({
        id: t.id,
        title: t.title,
        isPinned: t.isPinned,
        replyCount: t.replyCount,
        likeCount: t.likeCount,
        isLiked: likedSet.has(t.id),
        lastReplyAt: t.lastReplyAt,
        createdBy: formatAuthor(t.createdBy),
        createdAt: t.createdAt,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createThread(projectId: string, userId: string, title: string) {
    const thread = await this.prisma.projectThread.create({
      data: { projectId, title, createdByUserId: userId },
      include: { createdBy: { select: AUTHOR_SELECT } },
    });
    return {
      ...thread,
      createdBy: formatAuthor(thread.createdBy),
    };
  }

  // ========== Replies ==========

  async getReplies(threadId: string, userId: string) {
    const replies = await this.prisma.projectThreadReply.findMany({
      where: { threadId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: AUTHOR_SELECT } },
    });

    const replyIds = replies.map((r) => r.id);
    const likedReplies =
      replyIds.length > 0
        ? await this.prisma.projectThreadLike.findMany({
            where: { userId, replyId: { in: replyIds } },
            select: { replyId: true },
          })
        : [];
    const likedSet = new Set(likedReplies.map((l) => l.replyId));

    return replies.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      body: r.body,
      likeCount: r.likeCount,
      isLiked: likedSet.has(r.id),
      author: formatAuthor(r.author),
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
      author: formatAuthor(reply.author),
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
    const tasks = await this.prisma.projectTask.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        createdBy: { select: AUTHOR_SELECT },
        assignees: { include: { user: { select: AUTHOR_SELECT } } },
        attachments: {
          include: { file: { select: { id: true, originalName: true, publicUrl: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return tasks.map((t) => ({
      ...t,
      createdBy: formatAuthor(t.createdBy),
      assignees: t.assignees.map((a) => ({
        id: a.id,
        userId: a.user.id,
        name: a.user.name,
        avatarUrl: a.user.profile?.avatarUrl ?? null,
      })),
      attachments: t.attachments.map((a) => ({
        id: a.id,
        fileId: a.file.id,
        fileName: a.file.originalName,
        fileUrl: a.file.publicUrl,
      })),
    }));
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
      createdBy: formatAuthor(task.createdBy),
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
    data: {
      title?: string;
      description?: string;
      status?: string;
      requestedDate?: string | null;
      dueDate?: string | null;
      assigneeIds?: string[];
      fileIds?: string[];
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.projectTask.update({
        where: { id: taskId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.status !== undefined && { status: data.status as any }),
          ...(data.requestedDate !== undefined && {
            requestedDate: data.requestedDate ? new Date(data.requestedDate) : null,
          }),
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          }),
        },
      });

      if (data.assigneeIds !== undefined) {
        await tx.projectTaskAssignee.deleteMany({ where: { taskId } });
        if (data.assigneeIds.length > 0) {
          await tx.projectTaskAssignee.createMany({
            data: data.assigneeIds.map((userId) => ({ taskId, userId })),
          });
        }
      }

      if (data.fileIds !== undefined) {
        await tx.projectTaskAttachment.deleteMany({ where: { taskId } });
        if (data.fileIds.length > 0) {
          await tx.projectTaskAttachment.createMany({
            data: data.fileIds.map((fileId, i) => ({ taskId, fileId, sortOrder: i })),
          });
        }
      }

      return tx.projectTask.findUnique({
        where: { id: taskId },
        include: {
          createdBy: { select: AUTHOR_SELECT },
          assignees: { include: { user: { select: AUTHOR_SELECT } } },
          attachments: {
            include: { file: { select: { id: true, originalName: true, publicUrl: true } } },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });
  }

  async deleteTask(taskId: string) {
    await this.prisma.projectTask.delete({ where: { id: taskId } });
  }

  // ───────────────────── Schedules ─────────────────────

  async getSchedules(projectId: string, startAt?: string, endAt?: string) {
    const where: any = { projectId };
    if (startAt && endAt) {
      where.AND = [{ endAt: { gte: new Date(startAt) } }, { startAt: { lte: new Date(endAt) } }];
    }
    return this.prisma.projectSchedule.findMany({
      where,
      orderBy: { startAt: "asc" },
      include: { createdBy: { select: AUTHOR_SELECT } },
    });
  }

  async createSchedule(
    projectId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      isAllDay?: boolean;
      location?: string;
    },
  ) {
    return this.prisma.projectSchedule.create({
      data: {
        projectId,
        createdByUserId: userId,
        title: data.title,
        description: data.description,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        isAllDay: data.isAllDay ?? false,
        location: data.location,
      },
      include: { createdBy: { select: AUTHOR_SELECT } },
    });
  }

  async updateSchedule(
    scheduleId: string,
    data: {
      title?: string;
      description?: string;
      startAt?: string;
      endAt?: string;
      isAllDay?: boolean;
      location?: string;
    },
  ) {
    return this.prisma.projectSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startAt !== undefined && { startAt: new Date(data.startAt) }),
        ...(data.endAt !== undefined && { endAt: new Date(data.endAt) }),
        ...(data.isAllDay !== undefined && { isAllDay: data.isAllDay }),
        ...(data.location !== undefined && { location: data.location }),
      },
      include: { createdBy: { select: AUTHOR_SELECT } },
    });
  }

  async deleteSchedule(scheduleId: string) {
    await this.prisma.projectSchedule.delete({ where: { id: scheduleId } });
  }

  // ========== Helpers ==========

  /**
   * タグ名の配列から、対応する Tag レコードを upsert（find by name → 既存再利用、なければ新規作成）し、
   * `ProjectTag` リンクと `projects.tags_text` を一括で更新する。
   *
   * トランザクション内で呼ぶ前提。tags が空配列なら ProjectTag 全削除 + tags_text='' に同期。
   * slug は name をそのまま使う。VARCHAR(50) を超える場合は truncate、衝突時は `-2` `-3` ... を付与。
   */
  private async syncProjectTags(
    tx: Prisma.TransactionClient,
    projectId: string,
    tagNames: string[],
  ): Promise<void> {
    const uniqueNames = Array.from(
      new Set(tagNames.map((n) => n.trim()).filter((n) => n.length > 0)),
    );

    const tagIds: string[] = [];
    for (const name of uniqueNames) {
      const existing = await tx.tag.findFirst({ where: { name }, select: { id: true } });
      if (existing) {
        tagIds.push(existing.id);
        continue;
      }
      const created = await this.createTagWithUniqueSlug(tx, name);
      tagIds.push(created.id);
    }

    await tx.projectTag.deleteMany({ where: { projectId } });
    if (tagIds.length > 0) {
      await tx.projectTag.createMany({
        data: tagIds.map((tagId) => ({ projectId, tagId })),
        skipDuplicates: true,
      });
    }

    // tags_text を同期（スペース区切り、name ソートで安定化）
    const tagsText = [...uniqueNames].sort().join(" ");
    await tx.project.update({ where: { id: projectId }, data: { tagsText } });
  }

  /**
   * 名前から slug を生成して Tag を作成する。slug 衝突時は -2, -3 ... と suffix を付与。
   * VARCHAR(50) を超える slug は base を truncate して suffix の余地を確保。
   */
  private async createTagWithUniqueSlug(
    tx: Prisma.TransactionClient,
    name: string,
  ): Promise<{ id: string }> {
    const SLUG_MAX = 50;
    const baseSlug = name.slice(0, SLUG_MAX);
    for (let suffix = 1; suffix <= 100; suffix++) {
      const slug = suffix === 1 ? baseSlug : `${baseSlug.slice(0, SLUG_MAX - 4)}-${suffix}`;
      const conflict = await tx.tag.findUnique({ where: { slug }, select: { id: true } });
      if (!conflict) {
        return tx.tag.create({ data: { name, slug }, select: { id: true } });
      }
    }
    throw new BadRequestException("タグの slug 衝突上限を超えました");
  }
}
