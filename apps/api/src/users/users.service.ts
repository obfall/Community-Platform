import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "@/prisma/prisma.service";
import type { UserListQueryDto } from "./dto/user-list-query.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { UpdatePublicInfoDto } from "./dto/update-public-info.dto";
import type { UpdateInterestsDto } from "./dto/update-interests.dto";
import type { UpdateLanguagesDto } from "./dto/update-languages.dto";
import type { UpdateAffiliationsDto } from "./dto/update-affiliations.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : { status: "active" }),
      ...(query.role && { role: query.role }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          {
            publicInfo: {
              nickname: { contains: query.search, mode: "insensitive" as const },
            },
          },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          profile: { select: { avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        avatarUrl: user.profile?.avatarUrl ?? null,
        createdAt: user.createdAt,
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
            bio: true,
            phone: true,
            birthday: true,
            website: true,
            nameKana: true,
            gender: true,
            occupation: true,
            countryOfOrigin: true,
            allowDirectMessages: true,
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

    return {
      ...user,
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

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("ユーザーが見つかりません");
  }
}
