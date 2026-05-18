import { HttpStatus, Injectable } from "@nestjs/common";
import { ErrorCode } from "@community-platform/shared";
import { randomBytes } from "crypto";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import { BusinessException } from "@/common/exceptions";
import errorMessages from "@/i18n/messages/ja/errors.json";
import {
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  pgroongaSearchAndFetch,
} from "@/common/utils";
import { Prisma } from "@prisma/client";
import type { CreateAlbumDto } from "./dto/create-album.dto";
import type { UpdateAlbumDto } from "./dto/update-album.dto";
import type { AlbumPhotoEntryDto } from "./dto/add-photos.dto";
import type { AlbumQueryDto } from "./dto/album-query.dto";

type CurrentUser = { id: string; role: string };

function isPrivileged(user: CurrentUser) {
  return user.role === "admin" || user.role === "owner";
}

const ALBUM_CATEGORIES_CACHE_KEY = "master:categories:album:all";
const ALBUM_CATEGORIES_CACHE_PREFIX = "master:categories:album:";
const CATEGORIES_CACHE_TTL_SEC = 60 * 60;

function notFoundAlbum() {
  return new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    errorMessages.not_found.album,
    undefined,
    "errors.not_found.album",
  );
}

function notFoundPhoto() {
  return new BusinessException(
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    errorMessages.not_found.album_photo,
    undefined,
    "errors.not_found.album_photo",
  );
}

function forbidden(resourceKey: "album_update" | "album_delete") {
  return new BusinessException(
    ErrorCode.FORBIDDEN,
    HttpStatus.FORBIDDEN,
    errorMessages.forbidden_resource[resourceKey],
    undefined,
    `errors.forbidden_resource.${resourceKey}`,
  );
}

function canMutateAlbum(album: { createdByUserId: string }, user: CurrentUser) {
  return isPrivileged(user) || album.createdByUserId === user.id;
}

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(query: AlbumQueryDto, currentUser: CurrentUser) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped, currentUser);
    }
    return this.findAllStandard(query, currentUser);
  }

  /**
   * 一覧の可視性条件:
   * - published: 全員に表示
   * - draft / unpublished: 作成者本人のみ表示（admin / owner は全件表示）
   */
  private visibilityWhere(currentUser: CurrentUser): Prisma.AlbumWhereInput {
    if (isPrivileged(currentUser)) return {};
    return {
      OR: [{ publishStatus: "published" }, { createdByUserId: currentUser.id }],
    };
  }

  private async findAllStandard(query: AlbumQueryDto, currentUser: CurrentUser) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.AlbumWhereInput = {
      deletedAt: null,
      ...this.visibilityWhere(currentUser),
    };
    if (query.categoryId) where.categoryId = query.categoryId;

    const [data, total] = await Promise.all([
      this.prisma.album.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take: limit,
        include: this.albumListInclude(),
      }),
      this.prisma.album.count({ where }),
    ]);

    return this.formatAlbumList(data, total, page, limit);
  }

  /** pgroonga 全文検索。published に加えて作成者自身の下書きも対象（admin/owner は全件）。 */
  private async searchByPgroonga(query: AlbumQueryDto, escaped: string, currentUser: CurrentUser) {
    const { page, limit, offset } = extractPagination(query);

    const visibilitySql = isPrivileged(currentUser)
      ? Prisma.empty
      : Prisma.sql`AND (publish_status = 'published'::"PublishStatus" OR created_by_user_id = ${currentUser.id}::uuid)`;

    const where = Prisma.sql`
      deleted_at IS NULL
      ${visibilitySql}
      ${query.categoryId ? Prisma.sql`AND category_id = ${query.categoryId}::uuid` : Prisma.empty}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "albums",
      searchColumns: ["title", "description"],
      titleColumn: "title",
      snippetColumn: "description",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.album.findMany({
          where: { id: { in: ids }, deletedAt: null, ...this.visibilityWhere(currentUser) },
          include: this.albumListInclude(),
        }),
    });

    return this.formatAlbumList(records, total, page, limit, hitsById);
  }

  private albumListInclude() {
    return {
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    } satisfies Prisma.AlbumInclude;
  }

  private formatAlbumList(
    data: Array<
      Prisma.AlbumGetPayload<{
        include: {
          category: { select: { id: true; name: true } };
          createdBy: { select: { id: true; name: true } };
        };
      }>
    >,
    total: number,
    page: number,
    limit: number,
    hitsById?: Map<string, { titleHighlighted: string; snippetHighlighted: string }>,
  ) {
    return {
      data: data.map((a) => {
        const h = hitsById?.get(a.id);
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          titleHighlighted: h?.titleHighlighted,
          snippetHighlighted: h?.snippetHighlighted,
          coverPhotoUrl: a.coverPhotoUrl,
          publishStatus: a.publishStatus,
          photoCount: a.photoCount,
          category: a.category,
          createdBy: a.createdBy,
          createdAt: a.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string, currentUser: CurrentUser) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        photos: {
          where: { publishStatus: "published" },
          orderBy: { sortOrder: "asc" },
          include: { file: { select: { id: true, publicUrl: true, originalName: true } } },
        },
      },
    });
    if (!album || album.deletedAt) throw notFoundAlbum();
    if (album.publishStatus !== "published" && !canMutateAlbum(album, currentUser)) {
      throw notFoundAlbum();
    }
    return album;
  }

  async create(currentUserId: string, dto: CreateAlbumDto) {
    return this.prisma.album.create({
      data: {
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        createdByUserId: currentUserId,
        publishStatus: dto.publishStatus ?? "draft",
      },
    });
  }

  async update(id: string, dto: UpdateAlbumDto, currentUser: CurrentUser) {
    const album = await this.prisma.album.findUnique({ where: { id } });
    if (!album || album.deletedAt) throw notFoundAlbum();
    if (!canMutateAlbum(album, currentUser)) throw forbidden("album_update");

    return this.prisma.album.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.publishStatus !== undefined && { publishStatus: dto.publishStatus }),
      },
    });
  }

  async remove(id: string, currentUser: CurrentUser) {
    const album = await this.prisma.album.findUnique({ where: { id } });
    if (!album || album.deletedAt) throw notFoundAlbum();
    if (!canMutateAlbum(album, currentUser)) throw forbidden("album_delete");
    await this.prisma.album.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // --- 写真 ---

  async addPhotos(albumId: string, currentUser: CurrentUser, photos: AlbumPhotoEntryDto[]) {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album || album.deletedAt) throw notFoundAlbum();
    if (!canMutateAlbum(album, currentUser)) throw forbidden("album_update");

    const existingCount = await this.prisma.albumPhoto.count({ where: { albumId } });

    await this.prisma.albumPhoto.createMany({
      data: photos.map((p, i) => ({
        albumId,
        fileId: p.fileId,
        title: p.title,
        caption: p.caption,
        sortOrder: existingCount + i,
        publishStatus: "published",
        uploadedByUserId: currentUser.id,
      })),
    });

    // 写真数とカバー写真を更新
    const totalCount = existingCount + photos.length;
    const updateData: { photoCount: number; coverPhotoUrl?: string } = { photoCount: totalCount };
    if (existingCount === 0 && photos.length > 0) {
      const firstFile = await this.prisma.file.findUnique({
        where: { id: photos[0]!.fileId },
        select: { publicUrl: true },
      });
      if (firstFile?.publicUrl) updateData.coverPhotoUrl = firstFile.publicUrl;
    }

    await this.prisma.album.update({ where: { id: albumId }, data: updateData });

    return { count: photos.length };
  }

  async removePhoto(albumId: string, photoId: string, currentUser: CurrentUser) {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album || album.deletedAt) throw notFoundAlbum();
    if (!canMutateAlbum(album, currentUser)) throw forbidden("album_delete");

    const photo = await this.prisma.albumPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.albumId !== albumId) throw notFoundPhoto();

    await this.prisma.albumPhoto.delete({ where: { id: photoId } });
    await this.prisma.album.update({
      where: { id: albumId },
      data: { photoCount: { decrement: 1 } },
    });
  }

  // --- カテゴリ ---

  async getCategories() {
    return this.cache.getOrSet(
      ALBUM_CATEGORIES_CACHE_KEY,
      () =>
        this.prisma.category.findMany({
          where: { scope: "album", isActive: true },
          orderBy: { sortOrder: "asc" },
        }),
      CATEGORIES_CACHE_TTL_SEC,
    );
  }

  async createCategory(name: string) {
    // 並行リクエストでも衝突しない一意な slug を生成（name は日本語のためそのままでは slugify できない）
    const slug = `album-${randomBytes(6).toString("hex")}`;
    const created = await this.prisma.category.create({
      data: { scope: "album", slug, name },
    });
    await this.cache.invalidate(ALBUM_CATEGORIES_CACHE_PREFIX);
    return created;
  }
}
