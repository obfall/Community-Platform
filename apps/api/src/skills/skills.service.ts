import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateSkillListingDto } from "./dto/create-skill-listing.dto";
import type { CreateBookingDto } from "./dto/create-booking.dto";
import type { SkillQueryDto } from "./dto/skill-query.dto";

const PROVIDER_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- スキル出品 ---

  async findAll(query: SkillQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SkillListingWhereInput = { deletedAt: null, status: "active" };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.format) where.format = query.format;
    if (query.search) where.title = { contains: query.search, mode: "insensitive" };

    const [data, total] = await Promise.all([
      this.prisma.skillListing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          provider: { select: PROVIDER_SELECT },
        },
      }),
      this.prisma.skillListing.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        price: s.price,
        durationMinutes: s.durationMinutes,
        format: s.format,
        status: s.status,
        bookingCount: s.bookingCount,
        category: s.category,
        provider: {
          id: s.provider.id,
          name: s.provider.name,
          avatarUrl: s.provider.profile?.avatarUrl ?? null,
        },
        createdAt: s.createdAt,
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
    const listing = await this.prisma.skillListing.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: PROVIDER_SELECT },
      },
    });
    if (!listing || listing.deletedAt) throw new NotFoundException("スキルが見つかりません");

    return {
      ...listing,
      provider: {
        id: listing.provider.id,
        name: listing.provider.name,
        avatarUrl: listing.provider.profile?.avatarUrl ?? null,
      },
    };
  }

  async create(userId: string, dto: CreateSkillListingDto) {
    return this.prisma.skillListing.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price,
        durationMinutes: dto.durationMinutes,
        format: dto.format ?? "online",
        categoryId: dto.categoryId,
        providerUserId: userId,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
      format?: string;
      categoryId?: string;
      status?: string;
    },
  ) {
    const listing = await this.prisma.skillListing.findUnique({ where: { id } });
    if (!listing || listing.deletedAt) throw new NotFoundException("スキルが見つかりません");
    if (listing.providerUserId !== userId) throw new ForbiddenException();

    return this.prisma.skillListing.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.format !== undefined && { format: data.format as "online" | "offline" | "both" }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.status !== undefined && {
          status: data.status as "draft" | "active" | "inactive",
        }),
      },
    });
  }

  async remove(id: string, userId: string) {
    const listing = await this.prisma.skillListing.findUnique({ where: { id } });
    if (!listing || listing.deletedAt) throw new NotFoundException("スキルが見つかりません");
    if (listing.providerUserId !== userId) throw new ForbiddenException();

    await this.prisma.skillListing.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // --- 予約 ---

  async createBooking(listingId: string, requesterId: string, dto: CreateBookingDto) {
    const listing = await this.prisma.skillListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.deletedAt || listing.status !== "active") {
      throw new NotFoundException("スキルが見つかりません");
    }
    if (listing.providerUserId === requesterId) {
      throw new BadRequestException("自分のスキルには予約できません");
    }

    const booking = await this.prisma.skillBooking.create({
      data: {
        skillListingId: listingId,
        requesterUserId: requesterId,
        providerUserId: listing.providerUserId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        message: dto.message,
      },
    });

    await this.prisma.skillListing.update({
      where: { id: listingId },
      data: { bookingCount: { increment: 1 } },
    });

    return booking;
  }

  async getBookings(userId: string) {
    return this.prisma.skillBooking.findMany({
      where: {
        OR: [{ requesterUserId: userId }, { providerUserId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        skillListing: { select: { id: true, title: true, price: true } },
        requester: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
    });
  }

  async updateBookingStatus(
    bookingId: string,
    userId: string,
    status: "approved" | "rejected" | "completed" | "canceled",
  ) {
    const booking = await this.prisma.skillBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("予約が見つかりません");

    // 提供者のみ承認/拒否/完了可能、リクエスターはキャンセルのみ
    if (
      status === "canceled" &&
      booking.requesterUserId !== userId &&
      booking.providerUserId !== userId
    ) {
      throw new ForbiddenException();
    }
    if (
      (status === "approved" || status === "rejected" || status === "completed") &&
      booking.providerUserId !== userId
    ) {
      throw new ForbiddenException();
    }

    return this.prisma.skillBooking.update({
      where: { id: bookingId },
      data: {
        status,
        ...(status === "completed" && { completedAt: new Date() }),
        ...(status === "canceled" && { canceledAt: new Date() }),
      },
    });
  }

  // --- メッセージ ---

  async getMessages(bookingId: string, userId: string) {
    const booking = await this.prisma.skillBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("予約が見つかりません");
    if (booking.requesterUserId !== userId && booking.providerUserId !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.skillMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });
  }

  async sendMessage(bookingId: string, userId: string, body: string) {
    const booking = await this.prisma.skillBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("予約が見つかりません");
    if (booking.requesterUserId !== userId && booking.providerUserId !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.skillMessage.create({
      data: {
        bookingId,
        senderUserId: userId,
        body,
      },
    });
  }
}
