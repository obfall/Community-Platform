import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateVideoDto } from "./dto/create-video.dto";
import type { VideoQueryDto } from "./dto/video-query.dto";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: VideoQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VideoWhereInput = { deletedAt: null };
    if (query.publishStatus) where.publishStatus = query.publishStatus;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.seriesId) where.seriesId = query.seriesId;
    if (query.search) where.title = { contains: query.search, mode: "insensitive" };

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          series: { select: { id: true, name: true } },
          createdBy: { select: AUTHOR_SELECT },
        },
      }),
      this.prisma.video.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: videos.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
        publishStatus: v.publishStatus,
        streamStatus: v.streamStatus,
        viewCount: v.viewCount,
        category: v.category,
        series: v.series,
        createdBy: {
          id: v.createdBy.id,
          name: v.createdBy.name,
          avatarUrl: v.createdBy.profile?.avatarUrl ?? null,
        },
        createdAt: v.createdAt,
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
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
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
        tasks: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!video || video.deletedAt) throw new NotFoundException("動画が見つかりません");

    await this.prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    return {
      ...video,
      createdBy: {
        id: video.createdBy.id,
        name: video.createdBy.name,
        avatarUrl: video.createdBy.profile?.avatarUrl ?? null,
      },
      instructors: video.instructors.map((i) => ({
        id: i.id,
        userId: i.user.id,
        name: i.user.name,
        avatarUrl: i.user.profile?.avatarUrl ?? null,
      })),
      attachments: video.attachments.map((a) => ({
        id: a.id,
        fileId: a.file.id,
        fileName: a.file.originalName,
        fileUrl: a.file.publicUrl,
      })),
    };
  }

  async create(userId: string, dto: CreateVideoDto) {
    const video = await this.prisma.video.create({
      data: {
        title: dto.title,
        description: dto.description,
        videoProvider: dto.videoProvider,
        videoExternalId: dto.videoExternalId,
        playbackUrl: dto.playbackUrl,
        thumbnailUrl: dto.thumbnailUrl,
        categoryId: dto.categoryId,
        seriesId: dto.seriesId,
        createdByUserId: userId,
      },
    });
    return this.findOne(video.id);
  }

  async createForUpload(
    userId: string,
    data: { title: string; description?: string; categoryId?: string; seriesId?: string },
  ) {
    return this.prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        videoProvider: "r2_hls",
        videoExternalId: "pending",
        streamStatus: "uploading",
        categoryId: data.categoryId,
        seriesId: data.seriesId,
        createdByUserId: userId,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.video.update({ where: { id }, data: { deletedAt: new Date() } });
  }

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

  // Categories
  async getCategories() {
    return this.prisma.category.findMany({
      where: { scope: "video", isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createCategory(name: string) {
    const slug = `video-${Date.now()}`;
    return this.prisma.category.create({
      data: { scope: "video", slug, name },
    });
  }

  // Series
  async getSeries() {
    return this.prisma.videoSeries.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async createSeries(data: { name: string; description?: string }) {
    return this.prisma.videoSeries.create({ data });
  }
}
