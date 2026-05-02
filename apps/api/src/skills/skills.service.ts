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
  VISIBILITY,
} from "@/common/utils";
import { Prisma } from "@prisma/client";
import type { CreateSkillListingDto } from "./dto/create-skill-listing.dto";
import type { CreateBookingDto } from "./dto/create-booking.dto";
import type { SkillQueryDto } from "./dto/skill-query.dto";

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- スキル出品 ---

  async findAll(query: SkillQueryDto) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped);
    }
    return this.findAllStandard(query);
  }

  private async findAllStandard(query: SkillQueryDto) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.SkillListingWhereInput = { deletedAt: null, status: "active" };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.format) where.format = query.format;

    const [data, total] = await Promise.all([
      this.prisma.skillListing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: this.skillListInclude(),
      }),
      this.prisma.skillListing.count({ where }),
    ]);

    return this.formatSkillList(data, total, page, limit);
  }

  /** pgroonga による全文検索版（VISIBILITY.skillListing 強制）。 */
  private async searchByPgroonga(query: SkillQueryDto, escaped: string) {
    const { page, limit, offset } = extractPagination(query);

    const where = Prisma.sql`
      deleted_at IS NULL
      AND status = 'active'::"SkillListingStatus"
      ${query.categoryId ? Prisma.sql`AND category_id = ${query.categoryId}::uuid` : Prisma.empty}
      ${query.format ? Prisma.sql`AND format = ${query.format}::"SkillFormat"` : Prisma.empty}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "skill_listings",
      searchColumns: ["title", "description"],
      titleColumn: "title",
      snippetColumn: "description",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.skillListing.findMany({
          where: { id: { in: ids }, ...VISIBILITY.skillListing },
          include: this.skillListInclude(),
        }),
    });

    return this.formatSkillList(records, total, page, limit, hitsById);
  }

  private skillListInclude() {
    return {
      category: { select: { id: true, name: true } },
      provider: { select: AUTHOR_SELECT },
    } satisfies Prisma.SkillListingInclude;
  }

  private formatSkillList(
    data: Array<
      Prisma.SkillListingGetPayload<{
        include: {
          category: { select: { id: true; name: true } };
          provider: { select: typeof AUTHOR_SELECT };
        };
      }>
    >,
    total: number,
    page: number,
    limit: number,
    hitsById?: Map<string, { titleHighlighted: string; snippetHighlighted: string }>,
  ) {
    return {
      data: data.map((s) => {
        const h = hitsById?.get(s.id);
        return {
          id: s.id,
          title: s.title,
          description: s.description,
          titleHighlighted: h?.titleHighlighted,
          snippetHighlighted: h?.snippetHighlighted,
          price: s.price,
          durationMinutes: s.durationMinutes,
          format: s.format,
          status: s.status,
          bookingCount: s.bookingCount,
          category: s.category,
          provider: formatAuthor(s.provider),
          createdAt: s.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const listing = await this.prisma.skillListing.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: AUTHOR_SELECT },
      },
    });
    if (!listing || listing.deletedAt) throw new NotFoundException("スキルが見つかりません");

    return {
      ...listing,
      provider: formatAuthor(listing.provider),
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

  // --- コメント ---

  async getComments(skillListingId: string) {
    return this.prisma.skillComment.findMany({
      where: { skillListingId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
        },
      },
    });
  }

  async addComment(skillListingId: string, userId: string, body: string) {
    const listing = await this.prisma.skillListing.findUnique({ where: { id: skillListingId } });
    if (!listing || listing.deletedAt) throw new NotFoundException("スキルが見つかりません");

    return this.prisma.skillComment.create({
      data: {
        skillListingId,
        authorUserId: userId,
        body,
      },
      include: {
        author: {
          select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
        },
      },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.skillComment.findUnique({
      where: { id: commentId },
      include: { skillListing: { select: { providerUserId: true } } },
    });
    if (!comment || comment.deletedAt) throw new NotFoundException("コメントが見つかりません");
    if (comment.authorUserId !== userId && comment.skillListing.providerUserId !== userId) {
      throw new ForbiddenException();
    }

    await this.prisma.skillComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }
}
