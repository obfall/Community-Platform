import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@/prisma/prisma.service";
import {
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  uuidArrayParam,
} from "@/common/utils";
import { AuthService } from "@/auth/auth.service";
import { EmailService } from "@/broadcasts/email.service";
import type { UserListQueryDto } from "./dto/user-list-query.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { UpdatePublicInfoDto } from "./dto/update-public-info.dto";
import type { UpdateInterestsDto } from "./dto/update-interests.dto";
import type { UpdateLanguagesDto } from "./dto/update-languages.dto";
import type { UpdateAffiliationsDto } from "./dto/update-affiliations.dto";
import type { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import type { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import type { UpdateUserEmailDto } from "./dto/update-user-email.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  async findAll(query: UserListQueryDto) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped);
    }
    return this.findAllStandard(query);
  }

  private async findAllStandard(query: UserListQueryDto) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status
        ? { status: query.status }
        : { status: { in: ["active", "suspended"] as const } }),
      ...(query.role && { role: query.role }),
      ...(query.excludeAdmin && { role: { not: "admin" } }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.userListSelect(),
        orderBy: this.buildOrderBy(query.sortBy, query.sortOrder),
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return this.formatUserList(users, total, page, limit);
  }

  /**
   * pgroonga による全文検索版（Q11 確定）。
   * users.name / user_public_info.{nickname,introduction,specialty,prefecture} /
   * user_affiliations.{organization_name,title,role_description}
   * を UNION で横断検索し、user_id ごとに最大スコアでソート。
   */
  private async searchByPgroonga(query: UserListQueryDto, escaped: string) {
    const { page, limit, offset } = extractPagination(query);

    const status = query.status
      ? Prisma.sql`u.status = ${query.status}::"UserStatus"`
      : Prisma.sql`u.status IN ('active'::"UserStatus", 'suspended'::"UserStatus")`;
    const roleFilter = query.role
      ? Prisma.sql`AND u.role = ${query.role}::"UserRole"`
      : query.excludeAdmin
        ? Prisma.sql`AND u.role <> 'admin'::"UserRole"`
        : Prisma.empty;

    // 4 テーブルのマッチを user_id 軸で集約するためのサブクエリ。
    // UNION ALL（重複行を残す）にし、検索版は GROUP BY で MAX(score) に集約、
    // count 版は COUNT(DISTINCT user_id) で重複排除する。両者で同じソースを使うことで
    // 公開条件・カラム構成のドリフトを防ぐ（保守時の片側修正事故の防止）。
    const matchedSource = Prisma.sql`
      SELECT id AS user_id, pgroonga_score(tableoid, ctid) AS score
        FROM users WHERE name &@~ ${escaped} AND deleted_at IS NULL
      UNION ALL
      SELECT user_id, pgroonga_score(tableoid, ctid) AS score
        FROM user_public_info
        WHERE ARRAY[
          coalesce(nickname, ''),
          coalesce(introduction, ''),
          coalesce(specialty, ''),
          coalesce(prefecture, '')
        ] &@~ ${escaped}
      UNION ALL
      SELECT user_id, pgroonga_score(tableoid, ctid) AS score
        FROM user_affiliations
        WHERE ARRAY[
          coalesce(organization_name, ''),
          coalesce(title, ''),
          coalesce(role_description, '')
        ] &@~ ${escaped}
    `;

    const matched = await this.prisma.$queryRaw<Array<{ id: string; score: number }>>(Prisma.sql`
      WITH matched AS (${matchedSource})
      SELECT u.id, MAX(m.score) AS score
      FROM matched m
      JOIN users u ON u.id = m.user_id
      WHERE u.deleted_at IS NULL
        AND ${status}
        ${roleFilter}
      GROUP BY u.id
      ORDER BY score DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      WITH matched AS (${matchedSource})
      SELECT COUNT(DISTINCT m.user_id)::bigint AS count
      FROM matched m
      JOIN users u ON u.id = m.user_id
      WHERE u.deleted_at IS NULL
        AND ${status}
        ${roleFilter}
    `);
    const total = Number(totalRows[0]?.count ?? 0);

    if (matched.length === 0) {
      return this.formatUserList([], total, page, limit);
    }

    // ハイライトは name のみ（公開ステータス問わず name は表示するため）
    const highlights = await this.prisma.$queryRaw<
      Array<{ id: string; title_highlighted: string }>
    >(Prisma.sql`
      SELECT id, pgroonga_highlight_html(name, pgroonga_query_extract_keywords(${escaped})) AS title_highlighted
      FROM users WHERE id = ANY(${uuidArrayParam(matched.map((m) => m.id))}::uuid[])
    `);
    const highlightById = new Map(highlights.map((h) => [h.id, h.title_highlighted]));

    const users = await this.prisma.user.findMany({
      where: { id: { in: matched.map((m) => m.id) } },
      select: this.userListSelect(),
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const ordered = matched
      .map((m) => byId.get(m.id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u));

    return this.formatUserList(ordered, total, page, limit, highlightById);
  }

  private userListSelect() {
    return {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      profile: { select: { avatarUrl: true } },
    } satisfies Prisma.UserSelect;
  }

  private formatUserList(
    users: Array<
      Prisma.UserGetPayload<{
        select: {
          id: true;
          email: true;
          name: true;
          role: true;
          status: true;
          createdAt: true;
          profile: { select: { avatarUrl: true } };
        };
      }>
    >,
    total: number,
    page: number,
    limit: number,
    titleHighlightById?: Map<string, string>,
  ) {
    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        titleHighlighted: titleHighlightById?.get(user.id),
        role: user.role,
        status: user.status,
        avatarUrl: user.profile?.avatarUrl ?? null,
        createdAt: user.createdAt,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * メンバー詳細を取得する。
   * - 自分自身 or admin 以外の閲覧では email を返さない（プライバシー保護）。
   * - 呼び出し側が常に viewerRole / viewerId を渡せばクライアント側で API レスポンスから
   *   email がリークしない設計になる。
   */
  async findOne(id: string, viewer?: { id?: string; role?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        profile: {
          select: {
            avatarUrl: true,
            phone: true,
            birthday: true,
            nameKana: true,
            gender: true,
            occupation: true,
            countryOfOrigin: true,
            headerImageUrl: true,
          },
        },
        publicInfo: {
          select: {
            nickname: true,
            nicknameKana: true,
            specialty: true,
            prefecture: true,
            city: true,
            foreignCountry: true,
            foreignCity: true,
            introduction: true,
            eventRole: true,
            publicStatus: true,
          },
        },
        interests: {
          select: {
            id: true,
            categoryId: true,
            category: { select: { name: true } },
          },
        },
        languages: {
          select: {
            id: true,
            languageCode: true,
            proficiency: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        affiliations: {
          select: {
            id: true,
            organizationName: true,
            title: true,
            roleDescription: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!user) throw new NotFoundException("ユーザーが見つかりません");

    // email は admin 本人 or 当人 以外には返さない。
    const canSeeEmail = viewer?.role === "admin" || viewer?.id === user.id;
    const email = canSeeEmail ? user.email : null;

    return {
      ...user,
      email,
      avatarUrl: user.profile?.avatarUrl ?? null,
      interests: user.interests.map((i) => ({
        id: i.id,
        categoryId: i.categoryId,
        categoryName: i.category.name,
      })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.ensureUserExists(userId);

    // dto は ValidationPipe (whitelist + forbidNonWhitelisted) を通過済みのため
    // UpdateProfileDto に定義されていないフィールドは含まれない（Mass Assignment 対策済み）。
    const profileData = { ...dto } as Record<string, unknown>;
    if (dto.birthday) {
      profileData.birthday = new Date(dto.birthday);
    }

    return this.prisma.userProfile.upsert({
      where: { userId },
      update: profileData,
      create: { user: { connect: { id: userId } }, ...profileData },
    });
  }

  async updatePublicInfo(userId: string, dto: UpdatePublicInfoDto) {
    await this.ensureUserExists(userId);

    // dto は ValidationPipe (whitelist + forbidNonWhitelisted) を通過済みのため
    // 想定外のフィールドが書き込まれることはない（Mass Assignment 対策済み）。
    return this.prisma.userPublicInfo.upsert({
      where: { userId },
      update: dto,
      create: { user: { connect: { id: userId } }, ...dto },
    });
  }

  async replaceInterests(userId: string, dto: UpdateInterestsDto) {
    await this.ensureUserExists(userId);

    await this.prisma.$transaction([
      this.prisma.userInterest.deleteMany({ where: { userId } }),
      this.prisma.userInterest.createMany({
        data: dto.categoryIds.map((categoryId) => ({ userId, categoryId })),
      }),
    ]);

    return this.prisma.userInterest.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
    });
  }

  async findInterestCategories() {
    return this.prisma.category.findMany({
      where: { scope: "user_interest", isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    });
  }

  async replaceLanguages(userId: string, dto: UpdateLanguagesDto) {
    await this.ensureUserExists(userId);

    await this.prisma.$transaction([
      this.prisma.userLanguage.deleteMany({ where: { userId } }),
      this.prisma.userLanguage.createMany({
        data: dto.languages.map((lang, index) => ({
          userId,
          languageCode: lang.languageCode,
          proficiency: lang.proficiency,
          sortOrder: lang.sortOrder ?? index,
        })),
      }),
    ]);

    return this.prisma.userLanguage.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async replaceAffiliations(userId: string, dto: UpdateAffiliationsDto) {
    await this.ensureUserExists(userId);

    await this.prisma.$transaction([
      this.prisma.userAffiliation.deleteMany({ where: { userId } }),
      this.prisma.userAffiliation.createMany({
        data: dto.affiliations.map((aff, index) => ({
          userId,
          organizationName: aff.organizationName,
          title: aff.title,
          roleDescription: aff.roleDescription,
          sortOrder: aff.sortOrder ?? index,
        })),
      }),
    ]);

    return this.prisma.userAffiliation.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async updateRole(
    targetUserId: string,
    currentUser: { id: string; role: string },
    dto: UpdateUserRoleDto,
  ) {
    const target = await this.validateAdminAction(targetUserId, currentUser);

    if (currentUser.role === "owner") {
      if (dto.role === "admin") {
        throw new ForbiddenException("運営者はシステム管理者に昇格させることはできません");
      }
    }

    return this.prisma.user.update({
      where: { id: target.id },
      data: { role: dto.role },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
  }

  async updateStatus(
    targetUserId: string,
    currentUser: { id: string; role: string },
    dto: UpdateUserStatusDto,
  ) {
    const target = await this.validateAdminAction(targetUserId, currentUser);

    return this.prisma.user.update({
      where: { id: target.id },
      data: { status: dto.status },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
  }

  async forcePasswordReset(targetUserId: string, currentUser: { id: string; role: string }) {
    await this.validateAdminAction(targetUserId, currentUser);
    await this.authService.issuePasswordResetForUser(targetUserId);
    return { success: true };
  }

  async updateEmail(
    targetUserId: string,
    currentUser: { id: string; role: string },
    dto: UpdateUserEmailDto,
  ) {
    const target = await this.validateAdminAction(targetUserId, currentUser);

    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { email: true },
    });

    if (current.email === dto.email) {
      return this.findOne(target.id);
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("このメールアドレスは既に使用されています");
    }

    const oldEmail = current.email;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: target.id },
        data: { email: dto.email, emailVerifiedAt: null },
      }),
      // 旧メール経由のセッションを無効化
      this.prisma.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.emailService.sendEmailChangeNotification(oldEmail, dto.email);
    this.emailService.sendEmailChangeNotification(dto.email, dto.email);

    return this.findOne(target.id);
  }

  private async validateAdminAction(
    targetUserId: string,
    currentUser: { id: string; role: string },
  ) {
    if (targetUserId === currentUser.id) {
      throw new ForbiddenException("自分自身に対してこの操作は実行できません");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true, role: true },
    });

    if (!target) throw new NotFoundException("ユーザーが見つかりません");

    if (currentUser.role === "owner" && target.role === "admin") {
      throw new ForbiddenException("運営者はシステム管理者を操作できません");
    }

    return target;
  }

  async findUserEvents(userId: string) {
    await this.ensureUserExists(userId);

    const participants = await this.prisma.eventParticipant.findMany({
      where: { userId, status: { not: "canceled" } },
      select: {
        status: true,
        appliedAt: true,
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            startAt: true,
            endAt: true,
            locationType: true,
            venueName: true,
            coverImageUrl: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { event: { startAt: "desc" } },
    });

    return participants.map((p) => ({
      ...p.event,
      participantStatus: p.status,
      appliedAt: p.appliedAt,
    }));
  }

  async findUserProjects(userId: string) {
    await this.ensureUserExists(userId);

    const memberships = await this.prisma.projectMember.findMany({
      where: { userId, status: "active" },
      select: {
        role: true,
        joinedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            coverImageUrl: true,
            category: { select: { id: true, name: true } },
            memberCount: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => ({
      ...m.project,
      memberRole: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async findUserTickets(userId: string) {
    const participants = await this.prisma.eventParticipant.findMany({
      where: { userId, status: { not: "canceled" } },
      select: {
        id: true,
        quantity: true,
        status: true,
        paymentStatus: true,
        appliedAt: true,
        ticket: {
          select: {
            id: true,
            ticketName: true,
            price: true,
            currency: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            status: true,
            venueName: true,
            locationType: true,
          },
        },
      },
      orderBy: { event: { startAt: "desc" } },
    });

    return participants.map((p) => ({
      id: p.id,
      event: p.event,
      ticket: p.ticket,
      quantity: p.quantity,
      status: p.status,
      paymentStatus: p.paymentStatus,
      appliedAt: p.appliedAt,
    }));
  }

  async findUserReservations(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        status: true,
        note: true,
        createdAt: true,
        space: {
          select: {
            id: true,
            name: true,
            venue: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startAt: "desc" },
    });
  }

  async findUserTasks(userId: string) {
    const assignments = await this.prisma.projectTaskAssignee.findMany({
      where: { userId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueDate: true,
            requestedDate: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { task: { createdAt: "desc" } },
    });

    return assignments.map((a) => a.task);
  }

  async findUserLibrary(userId: string) {
    const [watchProgress, orders] = await Promise.all([
      this.prisma.videoWatchProgress.findMany({
        where: { userId },
        select: {
          watchedSeconds: true,
          totalSeconds: true,
          isCompleted: true,
          lastWatchedAt: true,
          video: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              durationSeconds: true,
            },
          },
        },
        orderBy: { lastWatchedAt: "desc" },
        take: 30,
      }),
      this.prisma.order.findMany({
        where: { buyerUserId: userId },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          items: {
            select: {
              productName: true,
              quantity: true,
              unitPrice: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return { videos: watchProgress, orders };
  }

  private buildOrderBy(
    sortBy?: "role" | "name" | "createdAt",
    sortOrder?: "asc" | "desc",
  ): Prisma.UserOrderByWithRelationInput[] {
    const order = sortOrder ?? "asc";
    switch (sortBy) {
      case "name":
        return [{ name: order }];
      case "createdAt":
        return [{ createdAt: order }];
      case "role":
      default:
        // enum 定義順: admin→owner→member→visitor（権限の高い順）
        return [{ role: "asc" }, { createdAt: "desc" }];
    }
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("ユーザーが見つかりません");
  }
}
