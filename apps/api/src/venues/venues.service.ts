import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ErrorCode } from "@community-platform/shared";
import { PrismaService } from "@/prisma/prisma.service";
import { BusinessException } from "@/common/exceptions";
import errorMessages from "@/i18n/messages/ja/errors.json";
import { escapePgroongaQuery, pgroongaSearchAndFetch, PGROONGA_MAX_LIMIT } from "@/common/utils";
import type { CreateVenueDto } from "./dto/create-venue.dto";
import type { CreateSpaceDto } from "./dto/create-space.dto";
import type { CreateReservationDto } from "./dto/create-reservation.dto";
import type { VenueQueryDto } from "./dto/venue-query.dto";

const VENUE_LIST_INCLUDE = {
  _count: { select: { spaces: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    include: { file: { select: { publicUrl: true } } },
  },
} satisfies Prisma.VenueInclude;

function notFoundVenue() {
  return new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    errorMessages.not_found.venue,
    undefined,
    "errors.not_found.venue",
  );
}

function notFoundSpace() {
  return new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    errorMessages.not_found.space,
    undefined,
    "errors.not_found.space",
  );
}

function notFoundReservation() {
  return new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    errorMessages.not_found.reservation,
    undefined,
    "errors.not_found.reservation",
  );
}

function reservationOverlap() {
  return new BusinessException(
    ErrorCode.CONFLICT,
    HttpStatus.CONFLICT,
    errorMessages.conflict.reservation_overlap,
    undefined,
    "errors.conflict.reservation_overlap",
  );
}

function forbiddenReservationCancel() {
  return new BusinessException(
    ErrorCode.FORBIDDEN,
    HttpStatus.FORBIDDEN,
    errorMessages.forbidden_resource.reservation_cancel,
    undefined,
    "errors.forbidden_resource.reservation_cancel",
  );
}

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 施設 ---

  async findAllVenues(query: VenueQueryDto = {}) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchVenuesByPgroonga(query, escaped);
    }
    const where: Prisma.VenueWhereInput = { deletedAt: null };
    if (query.publishStatus && query.publishStatus !== "all") {
      where.publishStatus = query.publishStatus as "draft" | "published" | "unpublished";
    }
    return this.prisma.venue.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: VENUE_LIST_INCLUDE,
    });
  }

  /** pgroonga 全文検索。検索条件は通常一覧と一致させる（下書き含む）。 */
  private async searchVenuesByPgroonga(query: VenueQueryDto, escaped: string) {
    const where = Prisma.sql`
      deleted_at IS NULL
      ${
        query.publishStatus && query.publishStatus !== "all"
          ? Prisma.sql`AND publish_status = ${query.publishStatus}::"PublishStatus"`
          : Prisma.empty
      }
    `;

    // 施設一覧は通常パスがページネーションを返さない（findMany 直返し）ため、
    // 検索パスもキャップ値で打ち切って配列返却にしている。
    // 中期改善: 全 12 ドメインの一覧 API をページ送り化（バックログ）。
    const { records, hitsById } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "venues",
      searchColumns: ["name", "description", "address", "access_info"],
      titleColumn: "name",
      snippetColumn: "description",
      escaped,
      where,
      limit: PGROONGA_MAX_LIMIT,
      offset: 0,
      fetchByIds: (ids) =>
        this.prisma.venue.findMany({
          where: { id: { in: ids }, deletedAt: null },
          include: VENUE_LIST_INCLUDE,
        }),
    });

    return records.map((v) => {
      const h = hitsById.get(v.id);
      return {
        ...v,
        titleHighlighted: h?.titleHighlighted,
        snippetHighlighted: h?.snippetHighlighted,
      };
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
    if (!venue || venue.deletedAt) throw notFoundVenue();
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
    if (!venue || venue.deletedAt) throw notFoundVenue();

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
      throw notFoundSpace();
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
    if (overlap) throw reservationOverlap();

    return this.prisma.reservation.create({
      data: { spaceId, userId, title: dto.title, startAt, endAt, note: dto.note },
    });
  }

  async cancelReservation(reservationId: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw notFoundReservation();
    if (reservation.userId !== userId) throw forbiddenReservationCancel();

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "canceled" },
    });
  }
}
