import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateVenueDto } from "./dto/create-venue.dto";
import type { CreateSpaceDto } from "./dto/create-space.dto";
import type { CreateReservationDto } from "./dto/create-reservation.dto";

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 施設 ---

  async findAllVenues(publishStatus?: string) {
    const where: { deletedAt: null; publishStatus?: "draft" | "published" | "unpublished" } = {
      deletedAt: null,
    };
    if (publishStatus && publishStatus !== "all") {
      where.publishStatus = publishStatus as "draft" | "published" | "unpublished";
    }
    return this.prisma.venue.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { spaces: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
          include: { file: { select: { publicUrl: true } } },
        },
      },
    });
  }

  async findOneVenue(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        spaces: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
        images: {
          orderBy: { sortOrder: "asc" },
          include: { file: { select: { publicUrl: true } } },
        },
        events: {
          where: { deletedAt: null },
          orderBy: { startAt: "desc" },
          select: { id: true, title: true, startAt: true, participantCount: true },
        },
      },
    });
    if (!venue || venue.deletedAt) throw new NotFoundException("施設が見つかりません");
    return venue;
  }

  async createVenue(userId: string, dto: CreateVenueDto) {
    return this.prisma.venue.create({
      data: {
        name: dto.name,
        address: dto.address,
        description: dto.description,
        accessInfo: dto.accessInfo,
        venueTypes: dto.venueTypes ?? [],
        capacity: dto.capacity,
        publishStatus: dto.publishStatus ?? "draft",
        createdByUserId: userId,
        ...(dto.imageFileIds &&
          dto.imageFileIds.length > 0 && {
            images: {
              create: dto.imageFileIds.map((fileId, i) => ({
                fileId,
                sortOrder: i,
                isPrimary: i === 0,
              })),
            },
          }),
      },
    });
  }

  async updateVenue(
    id: string,
    data: Partial<CreateVenueDto> & {
      publishStatus?: string;
      imageFileIds?: string[];
      venueTypes?: string[];
    },
  ) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue || venue.deletedAt) throw new NotFoundException("施設が見つかりません");

    if (data.imageFileIds !== undefined) {
      await this.prisma.venueImage.deleteMany({ where: { venueId: id } });
      if (data.imageFileIds.length > 0) {
        await this.prisma.venueImage.createMany({
          data: data.imageFileIds.map((fileId, i) => ({
            venueId: id,
            fileId,
            sortOrder: i,
            isPrimary: i === 0,
          })),
        });
      }
    }

    return this.prisma.venue.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.accessInfo !== undefined && { accessInfo: data.accessInfo }),
        ...(data.venueTypes !== undefined && { venueTypes: data.venueTypes }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.publishStatus !== undefined && { publishStatus: data.publishStatus }),
      },
    });
  }

  async removeVenue(id: string) {
    await this.prisma.venue.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // --- スペース ---

  async createSpace(venueId: string, dto: CreateSpaceDto) {
    return this.prisma.space.create({
      data: {
        venueId,
        name: dto.name,
        description: dto.description,
        capacity: dto.capacity,
        spaceTypes: dto.spaceTypes ?? [],
        publishStatus: "published",
      },
    });
  }

  // --- 予約 ---

  async getReservations(spaceId: string) {
    return this.prisma.reservation.findMany({
      where: { spaceId },
      orderBy: { startAt: "asc" },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async getVenueReservations(venueId: string) {
    return this.prisma.reservation.findMany({
      where: {
        space: { venueId, deletedAt: null },
        status: { not: "canceled" },
      },
      orderBy: { startAt: "asc" },
      include: {
        user: { select: { id: true, name: true } },
        space: { select: { id: true, name: true } },
      },
    });
  }

  async createReservation(spaceId: string, userId: string, dto: CreateReservationDto) {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (!space || space.deletedAt || !space.isReservable) {
      throw new NotFoundException("スペースが見つかりません");
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    // 重複チェック
    const overlap = await this.prisma.reservation.findFirst({
      where: {
        spaceId,
        status: { not: "canceled" },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (overlap) throw new BadRequestException("指定した時間帯は既に予約があります");

    return this.prisma.reservation.create({
      data: { spaceId, userId, title: dto.title, startAt, endAt, note: dto.note },
    });
  }

  async cancelReservation(reservationId: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException("予約が見つかりません");
    if (reservation.userId !== userId)
      throw new BadRequestException("この予約をキャンセルする権限がありません");

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "canceled" },
    });
  }
}
