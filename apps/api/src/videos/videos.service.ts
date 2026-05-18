import { Injectable, HttpStatus } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { NotificationsService } from "@/notifications/notifications.service";
import { BusinessException } from "@/common/exceptions";
import { ErrorCode } from "@community-platform/shared";
import {
  AUTHOR_SELECT,
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  formatAuthor,
  pgroongaSearchAndFetch,
} from "@/common/utils";

import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import type { CreateVideoDto } from "./dto/create-video.dto";
import type { UpdateVideoDto } from "./dto/update-video.dto";
import type { VideoQueryDto } from "./dto/video-query.dto";

const videoNotFound = () =>
  new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    "動画が見つかりません",
    undefined,
    "errors.not_found.video",
  );

const videoTaskNotFound = () =>
  new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    "タスクが見つかりません",
    undefined,
    "errors.not_found.video_task",
  );

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ───────────────────── findAll ─────────────────────

  async findAll(query: VideoQueryDto, currentUserId?: string) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped, currentUserId);
    }
    return this.findAllStandard(query, currentUserId);
  }

  private async findAllStandard(query: VideoQueryDto, currentUserId?: string) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.VideoWhereInput = { deletedAt: null };
    if (query.publishStatus) where.publishStatus = query.publishStatus;
    if (query.seriesId) where.seriesId = query.seriesId;

    // admin/owner 以外は公開中の動画のみに制限
    const currentUser = currentUserId
      ? await this.prisma.user.findUnique({
          where: { id: currentUserId },
          select: { role: true },
        })
      : null;
    const isPrivileged = currentUser?.role === "admin" || currentUser?.role === "owner";
    if (!isPrivileged) {
      where.publishStatus = "published";
    }

    // 視聴状態フィルタ（自分視点）
    if (query.watchStatus && currentUserId) {
      if (query.watchStatus === "watched") {
        where.watchProgress = { some: { userId: currentUserId, isCompleted: true } };
      } else if (query.watchStatus === "unwatched") {
        where.watchProgress = { none: { userId: currentUserId, isCompleted: true } };
      }
    }

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        orderBy: query.seriesId
          ? [{ watchOrder: "asc" }, { sortOrder: "asc" }]
          : { sortOrder: "asc" },
        skip,
        take: limit,
        include: this.videoListInclude(currentUserId),
      }),
      this.prisma.video.count({ where }),
    ]);

    return this.formatVideoList(videos, total, page, limit);
  }

  /** pgroonga による全文検索版。検索条件は通常一覧と一致させる（下書き含む）。 */
  private async searchByPgroonga(query: VideoQueryDto, escaped: string, currentUserId?: string) {
    const { page, limit, offset } = extractPagination(query);

    const where = Prisma.sql`
      deleted_at IS NULL
      ${query.seriesId ? Prisma.sql`AND series_id = ${query.seriesId}::uuid` : Prisma.empty}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "videos",
      searchColumns: ["title", "description"],
      titleColumn: "title",
      snippetColumn: "description",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.video.findMany({
          where: { id: { in: ids }, deletedAt: null },
          include: this.videoListInclude(currentUserId),
        }),
    });

    return this.formatVideoList(records, total, page, limit, hitsById);
  }

  private videoListInclude(currentUserId?: string) {
    return {
      series: { select: { id: true, name: true } },
      createdBy: { select: AUTHOR_SELECT },
      tasks: {
        select: {
          id: true,
          completions: currentUserId
            ? {
                where: { userId: currentUserId, status: "completed" as const },
                select: { id: true },
                take: 1,
              }
            : { select: { id: true }, take: 0 },
        },
      },
      watchProgress: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { isCompleted: true },
            take: 1,
          }
        : { select: { isCompleted: true }, take: 0 },
    } satisfies Prisma.VideoInclude;
  }

  private formatVideoList(
    videos: Array<
      Prisma.VideoGetPayload<{
        include: {
          series: { select: { id: true; name: true } };
          createdBy: { select: typeof AUTHOR_SELECT };
          tasks: { select: { id: true; completions: { select: { id: true } } } };
          watchProgress: { select: { isCompleted: true } };
        };
      }>
    >,
    total: number,
    page: number,
    limit: number,
    hitsById?: Map<string, { titleHighlighted: string; snippetHighlighted: string }>,
  ) {
    return {
      data: videos.map((v) => {
        const h = hitsById?.get(v.id);
        const taskCount = v.tasks.length;
        const incompleteTaskCount = v.tasks.filter((t) => t.completions.length === 0).length;
        const isWatched = v.watchProgress[0]?.isCompleted ?? false;
        return {
          id: v.id,
          title: v.title,
          description: v.description,
          titleHighlighted: h?.titleHighlighted,
          snippetHighlighted: h?.snippetHighlighted,
          thumbnailUrl: v.thumbnailUrl,
          durationSeconds: v.durationSeconds,
          watchOrder: v.watchOrder,
          publishStatus: v.publishStatus,
          streamStatus: v.streamStatus,
          viewCount: v.viewCount,
          availableUntil: v.availableUntil,
          hasPassword: !!v.passwordHash,
          series: v.series,
          createdBy: formatAuthor(v.createdBy),
          taskCount,
          incompleteTaskCount,
          isWatched,
          createdAt: v.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ───────────────────── findOne ─────────────────────

  async findOne(id: string, currentUserId?: string) {
    // admin/owner 以外は公開中の動画のみ閲覧可能
    // currentUserId が未指定の場合は内部呼び出し扱いで公開状態フィルタをスキップ
    const currentUser = currentUserId
      ? await this.prisma.user.findUnique({
          where: { id: currentUserId },
          select: { role: true },
        })
      : null;
    const isPrivileged =
      !currentUserId || currentUser?.role === "admin" || currentUser?.role === "owner";

    const video = await this.prisma.video.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isPrivileged ? {} : { publishStatus: "published" as const }),
      },
      include: {
        series: { select: { id: true, name: true } },
        createdBy: { select: AUTHOR_SELECT },
        instructors: {
          include: { user: { select: AUTHOR_SELECT } },
          orderBy: { sortOrder: "asc" },
        },
        attachments: {
          include: { file: { select: { id: true, originalName: true, publicUrl: true } } },
          orderBy: { sortOrder: "asc" },
        },
        tasks: {
          orderBy: { sortOrder: "asc" },
          include: {
            completions: currentUserId ? { where: { userId: currentUserId }, take: 1 } : false,
            attachments: {
              include: { file: { select: { id: true, originalName: true, publicUrl: true } } },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });
    if (!video) throw videoNotFound();

    await this.prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    // prev/next in series
    let prevVideo: { id: string; title: string; watchOrder: number | null } | null = null;
    let nextVideo: { id: string; title: string; watchOrder: number | null } | null = null;

    if (video.seriesId && video.watchOrder != null) {
      const [prev, next] = await Promise.all([
        this.prisma.video.findFirst({
          where: {
            seriesId: video.seriesId,
            watchOrder: { lt: video.watchOrder },
            deletedAt: null,
          },
          orderBy: { watchOrder: "desc" },
          select: { id: true, title: true, watchOrder: true },
        }),
        this.prisma.video.findFirst({
          where: {
            seriesId: video.seriesId,
            watchOrder: { gt: video.watchOrder },
            deletedAt: null,
          },
          orderBy: { watchOrder: "asc" },
          select: { id: true, title: true, watchOrder: true },
        }),
      ]);
      prevVideo = prev;
      nextVideo = next;
    }

    // count videos in same series
    let seriesVideoCount: number | null = null;
    if (video.seriesId) {
      seriesVideoCount = await this.prisma.video.count({
        where: { seriesId: video.seriesId, deletedAt: null },
      });
    }

    return {
      ...video,
      hasPassword: !!video.passwordHash,
      passwordHash: undefined,
      createdBy: formatAuthor(video.createdBy),
      instructors: video.instructors.map((i) => ({
        id: i.id,
        userId: i.userId,
        name: i.name,
        affiliation: i.affiliation,
        avatarUrl: i.user?.profile?.avatarUrl ?? null,
      })),
      attachments: video.attachments.map((a) => ({
        id: a.id,
        fileId: a.file.id,
        fileName: a.file.originalName,
        fileUrl: a.file.publicUrl,
      })),
      tasks: video.tasks.map((t) => {
        const completion =
          Array.isArray(t.completions) && t.completions.length > 0 ? t.completions[0]! : null;
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          sortOrder: t.sortOrder,
          attachments: t.attachments.map((a) => ({
            id: a.id,
            fileId: a.file.id,
            fileName: a.file.originalName,
            fileUrl: a.file.publicUrl,
          })),
          ...(currentUserId && {
            status: completion?.status ?? "not_started",
            statusUpdatedAt: completion?.updatedAt.toISOString(),
            completedAt: completion?.completedAt?.toISOString(),
          }),
        };
      }),
      prevVideo,
      nextVideo,
      seriesVideoCount,
    };
  }

  // ───────────────────── create / createForUpload ─────────────────────

  async create(userId: string, dto: CreateVideoDto) {
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)
      : undefined;

    const video = await this.prisma.video.create({
      data: {
        title: dto.title,
        description: dto.description,
        videoProvider: dto.videoProvider,
        videoExternalId: dto.videoExternalId,
        playbackUrl: dto.playbackUrl,
        thumbnailUrl: dto.thumbnailUrl,
        seriesId: dto.seriesId,
        watchOrder: dto.watchOrder,
        publishStatus: dto.publishStatus ?? "draft",
        availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : undefined,
        passwordHash,
        createdByUserId: userId,
        ...(dto.instructors?.length && {
          instructors: {
            createMany: {
              data: dto.instructors.map((ins, idx) => ({
                userId: ins.userId ?? null,
                name: ins.name,
                affiliation: ins.affiliation ?? null,
                sortOrder: idx,
              })),
            },
          },
        }),
        ...(dto.attachmentFileIds?.length && {
          attachments: {
            createMany: {
              data: dto.attachmentFileIds.map((fileId, idx) => ({
                fileId,
                sortOrder: idx,
              })),
            },
          },
        }),
        ...(dto.tasks?.length &&
          !dto.tasks.some((t) => t.fileIds?.length) && {
            tasks: {
              createMany: {
                data: dto.tasks.map((t, idx) => ({
                  title: t.title,
                  description: t.description ?? null,
                  sortOrder: t.sortOrder ?? idx,
                })),
              },
            },
          }),
      },
    });

    // fileIds 付きタスクは個別に create（createMany はネスト不可）
    if (dto.tasks?.some((t) => t.fileIds?.length)) {
      for (let idx = 0; idx < dto.tasks.length; idx++) {
        const t = dto.tasks[idx]!;
        if (t.fileIds?.length) {
          await this.prisma.videoTask.create({
            data: {
              videoId: video.id,
              title: t.title,
              description: t.description ?? null,
              sortOrder: t.sortOrder ?? idx,
              attachments: {
                createMany: { data: t.fileIds.map((fileId, i) => ({ fileId, sortOrder: i })) },
              },
            },
          });
        }
      }
    }

    return this.findOne(video.id);
  }

  async createForUpload(
    userId: string,
    data: {
      title: string;
      description?: string;
      seriesId?: string;
      watchOrder?: number;
      publishStatus?: string;
      availableUntil?: string;
      password?: string;
      instructors?: string;
      attachmentFileIds?: string;
      tasks?: string;
    },
  ) {
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS)
      : undefined;

    // multipart body から JSON 文字列をパース
    const instructors = data.instructors ? JSON.parse(data.instructors) : [];
    const attachmentFileIds = data.attachmentFileIds ? JSON.parse(data.attachmentFileIds) : [];
    const tasks = data.tasks ? JSON.parse(data.tasks) : [];

    return this.prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        videoProvider: "r2_hls",
        videoExternalId: "pending",
        streamStatus: "uploading",
        seriesId: data.seriesId || undefined,
        watchOrder: data.watchOrder != null ? Number(data.watchOrder) : undefined,
        publishStatus: (data.publishStatus as "draft" | "published" | "unpublished") ?? "draft",
        availableUntil: data.availableUntil ? new Date(data.availableUntil) : undefined,
        passwordHash,
        createdByUserId: userId,
        ...(instructors.length > 0 && {
          instructors: {
            createMany: {
              data: instructors.map(
                (ins: { userId?: string; name: string; affiliation?: string }, idx: number) => ({
                  userId: ins.userId ?? null,
                  name: ins.name,
                  affiliation: ins.affiliation ?? null,
                  sortOrder: idx,
                }),
              ),
            },
          },
        }),
        ...(attachmentFileIds.length > 0 && {
          attachments: {
            createMany: {
              data: (attachmentFileIds as string[]).map((fileId: string, idx: number) => ({
                fileId,
                sortOrder: idx,
              })),
            },
          },
        }),
        ...(tasks.length > 0 && {
          tasks: {
            createMany: {
              data: tasks.map(
                (t: { title: string; description?: string; sortOrder?: number }, idx: number) => ({
                  title: t.title,
                  description: t.description ?? null,
                  sortOrder: t.sortOrder ?? idx,
                }),
              ),
            },
          },
        }),
      },
    });
  }

  // ───────────────────── update ─────────────────────

  async update(id: string, dto: UpdateVideoDto) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video || video.deletedAt) throw videoNotFound();

    // パスワード処理
    let passwordHash: string | null | undefined = undefined;
    if (dto.password !== undefined) {
      passwordHash = dto.password ? await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS) : null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.video.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.publishStatus !== undefined && { publishStatus: dto.publishStatus }),
          ...(dto.seriesId !== undefined && { seriesId: dto.seriesId }),
          ...(dto.watchOrder !== undefined && { watchOrder: dto.watchOrder }),
          ...(dto.availableUntil !== undefined && {
            availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : null,
          }),
          ...(passwordHash !== undefined && { passwordHash }),
        },
      });

      // Instructors: deleteMany → createMany
      if (dto.instructors !== undefined) {
        await tx.videoInstructor.deleteMany({ where: { videoId: id } });
        if (dto.instructors.length > 0) {
          await tx.videoInstructor.createMany({
            data: dto.instructors.map((ins, idx) => ({
              videoId: id,
              userId: ins.userId ?? null,
              name: ins.name,
              affiliation: ins.affiliation ?? null,
              sortOrder: idx,
            })),
          });
        }
      }

      // Attachments: deleteMany → createMany
      if (dto.attachmentFileIds !== undefined) {
        await tx.videoAttachment.deleteMany({ where: { videoId: id } });
        if (dto.attachmentFileIds.length > 0) {
          await tx.videoAttachment.createMany({
            data: dto.attachmentFileIds.map((fileId, idx) => ({
              videoId: id,
              fileId,
              sortOrder: idx,
            })),
          });
        }
      }

      // Tasks: diff update (id付き=更新, id無し=新規, 含まれない既存=削除)
      if (dto.tasks !== undefined) {
        const existingTasks = await tx.videoTask.findMany({ where: { videoId: id } });
        const existingIds = new Set(existingTasks.map((t) => t.id));
        const incomingIds = new Set(dto.tasks.filter((t) => t.id).map((t) => t.id!));

        // 削除: 既存にあるが incoming にない
        const toDelete = [...existingIds].filter((eid) => !incomingIds.has(eid));
        if (toDelete.length > 0) {
          await tx.videoTask.deleteMany({ where: { id: { in: toDelete } } });
        }

        for (let idx = 0; idx < dto.tasks.length; idx++) {
          const t = dto.tasks[idx]!;
          if (t.id && existingIds.has(t.id)) {
            // 更新
            await tx.videoTask.update({
              where: { id: t.id },
              data: {
                title: t.title,
                description: t.description ?? null,
                sortOrder: t.sortOrder ?? idx,
              },
            });
            // fileIds が指定されていれば添付ファイルを置き換え
            if (t.fileIds !== undefined) {
              await tx.videoTaskAttachment.deleteMany({ where: { taskId: t.id } });
              if (t.fileIds.length > 0) {
                await tx.videoTaskAttachment.createMany({
                  data: t.fileIds.map((fileId, i) => ({ taskId: t.id!, fileId, sortOrder: i })),
                });
              }
            }
          } else {
            // 新規
            const newTask = await tx.videoTask.create({
              data: {
                videoId: id,
                title: t.title,
                description: t.description ?? null,
                sortOrder: t.sortOrder ?? idx,
              },
            });
            if (t.fileIds?.length) {
              await tx.videoTaskAttachment.createMany({
                data: t.fileIds.map((fileId, i) => ({ taskId: newTask.id, fileId, sortOrder: i })),
              });
            }
          }
        }
      }
    });

    return this.findOne(id);
  }

  // ───────────────────── remove ─────────────────────

  async remove(id: string) {
    await this.prisma.video.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ───────────────────── Password ─────────────────────

  async verifyPassword(id: string, password: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: { passwordHash: true },
    });
    if (!video) throw videoNotFound();
    if (!video.passwordHash) return { ok: true };

    const valid = await bcrypt.compare(password, video.passwordHash);
    if (!valid)
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        HttpStatus.UNAUTHORIZED,
        "パスワードが正しくありません",
        undefined,
        "errors.unauthorized_resource.video_password",
      );
    return { ok: true };
  }

  // ───────────────────── Tasks: status 更新 ─────────────────────

  async updateTaskStatus(
    taskId: string,
    userId: string,
    status: "not_started" | "in_progress" | "completed",
  ) {
    const task = await this.prisma.videoTask.findUnique({ where: { id: taskId } });
    if (!task) throw videoTaskNotFound();

    if (status === "not_started") {
      // not_started はレコード削除で表現
      await this.prisma.videoTaskCompletion.deleteMany({
        where: { videoTaskId: taskId, userId },
      });
      return { status: "not_started" as const };
    }

    const completedAt = status === "completed" ? new Date() : null;

    const record = await this.prisma.videoTaskCompletion.upsert({
      where: { videoTaskId_userId: { videoTaskId: taskId, userId } },
      update: { status, completedAt },
      create: { videoTaskId: taskId, userId, status, completedAt },
    });
    return {
      status: record.status,
      completedAt: record.completedAt?.toISOString() ?? null,
      statusUpdatedAt: record.updatedAt.toISOString(),
    };
  }

  // ───────────────────── Task progress (admin) ─────────────────────

  async getTaskProgress(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, title: true },
    });
    if (!video) throw videoNotFound();

    const tasks = await this.prisma.videoTask.findMany({
      where: { videoId },
      orderBy: { sortOrder: "asc" },
      include: {
        completions: {
          include: {
            user: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });

    const allMembers = await this.prisma.user.findMany({
      where: { role: { in: ["admin", "owner", "member"] }, deletedAt: null },
      select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
    });

    return {
      videoTitle: video.title,
      totalMembers: allMembers.length,
      tasks: tasks.map((t) => {
        const completionByUser = new Map(t.completions.map((c) => [c.userId, c]));

        const completed: Array<{
          userId: string;
          name: string;
          avatarUrl: string | null;
          statusUpdatedAt: string;
          completedAt: string | null;
        }> = [];
        const inProgress: Array<{
          userId: string;
          name: string;
          avatarUrl: string | null;
          statusUpdatedAt: string;
        }> = [];
        const notStarted: Array<{ userId: string; name: string; avatarUrl: string | null }> = [];

        for (const m of allMembers) {
          const c = completionByUser.get(m.id);
          if (!c) {
            notStarted.push({
              userId: m.id,
              name: m.name,
              avatarUrl: m.profile?.avatarUrl ?? null,
            });
          } else if (c.status === "completed") {
            completed.push({
              userId: m.id,
              name: m.name,
              avatarUrl: m.profile?.avatarUrl ?? null,
              statusUpdatedAt: c.updatedAt.toISOString(),
              completedAt: c.completedAt?.toISOString() ?? null,
            });
          } else {
            inProgress.push({
              userId: m.id,
              name: m.name,
              avatarUrl: m.profile?.avatarUrl ?? null,
              statusUpdatedAt: c.updatedAt.toISOString(),
            });
          }
        }

        return {
          id: t.id,
          title: t.title,
          description: t.description,
          completedBy: completed,
          inProgressBy: inProgress,
          notStartedBy: notStarted,
          completionCount: completed.length,
          inProgressCount: inProgress.length,
          notStartedCount: notStarted.length,
        };
      }),
    };
  }

  // ───────────────────── Task remind ─────────────────────

  async sendTaskReminder(videoId: string, taskId: string, actorUserId: string, userIds: string[]) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { title: true },
    });
    if (!video) throw videoNotFound();

    const task = await this.prisma.videoTask.findUnique({
      where: { id: taskId },
      select: { title: true },
    });
    if (!task) throw videoTaskNotFound();

    // 対象ユーザー決定
    let targetUserIds: string[];
    if (userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      // 全未完了者 = completed ステータスではない人（未着手 or 進行中）
      const allMembers = await this.prisma.user.findMany({
        where: { role: { in: ["admin", "owner", "member"] }, deletedAt: null },
        select: { id: true },
      });
      const completedUserIds = await this.prisma.videoTaskCompletion.findMany({
        where: { videoTaskId: taskId, status: "completed" },
        select: { userId: true },
      });
      const completedSet = new Set(completedUserIds.map((c) => c.userId));
      targetUserIds = allMembers.filter((m) => !completedSet.has(m.id)).map((m) => m.id);
    }

    // 通知送信
    for (const uid of targetUserIds) {
      await this.notifications.create({
        userId: uid,
        type: "video_task_reminder",
        title: `未完了タスクがあります: ${video.title}`,
        body: `「${task.title}」を完了してください`,
        referenceType: "video",
        referenceId: videoId,
        actorUserId,
      });
    }

    return { sentCount: targetUserIds.length };
  }

  // ───────────────────── Replace file ─────────────────────

  async resetStreamForReplace(id: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video || video.deletedAt) throw videoNotFound();

    await this.prisma.video.update({
      where: { id },
      data: {
        streamStatus: "uploading",
        videoExternalId: "pending",
        playbackUrl: null,
        thumbnailUrl: null,
        durationSeconds: null,
      },
    });

    return { id };
  }

  // ───────────────────── Watch progress ─────────────────────

  async updateWatchProgress(
    videoId: string,
    userId: string,
    data: { watchedSeconds: number; lastPositionSeconds: number; totalSeconds: number },
  ) {
    const isCompleted = data.watchedSeconds >= data.totalSeconds * 0.9;

    return this.prisma.videoWatchProgress.upsert({
      where: { videoId_userId: { videoId, userId } },
      update: {
        watchedSeconds: data.watchedSeconds,
        lastPositionSeconds: data.lastPositionSeconds,
        lastWatchedAt: new Date(),
        ...(isCompleted && { isCompleted: true, completedAt: new Date() }),
      },
      create: {
        videoId,
        userId,
        watchedSeconds: data.watchedSeconds,
        totalSeconds: data.totalSeconds,
        lastPositionSeconds: data.lastPositionSeconds,
        isCompleted,
        ...(isCompleted && { completedAt: new Date() }),
      },
    });
  }

  async getWatchProgress(videoId: string, userId: string) {
    return this.prisma.videoWatchProgress.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });
  }

  // ───────────────────── Series ─────────────────────

  async getSeries() {
    return this.prisma.videoSeries.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async createSeries(data: { name: string; description?: string }) {
    return this.prisma.videoSeries.create({ data });
  }

  /** シリーズ内で次に使う watchOrder（既存の最大値 + 1、無ければ 1） */
  async getNextWatchOrder(seriesId: string) {
    const result = await this.prisma.video.aggregate({
      where: { seriesId, deletedAt: null },
      _max: { watchOrder: true },
    });
    const max = result._max.watchOrder ?? 0;
    return { nextOrder: max + 1 };
  }
}
