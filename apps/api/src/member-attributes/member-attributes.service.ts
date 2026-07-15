import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import { AttributeType } from "@prisma/client";
import type { CreateMemberAttributeDto } from "./dto/create-member-attribute.dto";
import type { UpdateMemberAttributeDto } from "./dto/update-member-attribute.dto";
import type { SetAttributeValuesDto } from "./dto/set-attribute-values.dto";
import type { ReorderAttributesDto } from "./dto/reorder-attributes.dto";

const CACHE_KEY = "master:member-attributes:all";
const CACHE_PREFIX = "master:member-attributes:";
const CACHE_TTL_SEC = 60 * 60;

@Injectable()
export class MemberAttributesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** 属性定義一覧 */
  async findAll() {
    return this.cache.getOrSet(
      CACHE_KEY,
      () =>
        this.prisma.memberAttribute.findMany({
          orderBy: { sortOrder: "asc" },
        }),
      CACHE_TTL_SEC,
    );
  }

  /** 属性定義作成 */
  async create(dto: CreateMemberAttributeDto) {
    // select/multi_select は options 必須
    if (
      (dto.type === AttributeType.select || dto.type === AttributeType.multi_select) &&
      (!dto.options || dto.options.length === 0)
    ) {
      throw new BadRequestException("select/multi_select タイプには options が必要です");
    }

    let slug = dto.slug;
    if (slug) {
      const existing = await this.prisma.memberAttribute.findUnique({ where: { slug } });
      if (existing) throw new ConflictException("このスラッグは既に使用されています");
    } else {
      slug = await this.generateNextSlug();
    }

    const created = await this.prisma.memberAttribute.create({
      data: {
        name: dto.name,
        slug,
        type: dto.type,
        options: dto.options ?? undefined,
        isRequired: dto.isRequired ?? false,
        isSelfEditable: dto.isSelfEditable ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.cache.invalidate(CACHE_PREFIX);
    return created;
  }

  /** attr_{N} 形式のスラッグを採番（既存の最大値+1、欠番は再利用しない） */
  private async generateNextSlug(): Promise<string> {
    const rows = await this.prisma.memberAttribute.findMany({
      where: { slug: { startsWith: "attr_" } },
      select: { slug: true },
    });
    const maxNum = rows.reduce((max, { slug }) => {
      const n = Number.parseInt(slug.slice("attr_".length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return `attr_${maxNum + 1}`;
  }

  /** 属性定義更新（type/slug 変更不可） */
  async update(id: string, dto: UpdateMemberAttributeDto) {
    const existing = await this.prisma.memberAttribute.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("属性が見つかりません");

    const updated = await this.prisma.memberAttribute.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.isSelfEditable !== undefined && { isSelfEditable: dto.isSelfEditable }),
      },
    });
    await this.cache.invalidate(CACHE_PREFIX);
    return updated;
  }

  /** 属性定義削除（値もカスケード削除） */
  async remove(id: string) {
    const existing = await this.prisma.memberAttribute.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("属性が見つかりません");

    await this.prisma.memberAttribute.delete({ where: { id } });
    await this.cache.invalidate(CACHE_PREFIX);
  }

  /** 並び替え */
  async reorder(dto: ReorderAttributesDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.memberAttribute.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    await this.cache.invalidate(CACHE_PREFIX);
  }

  /**
   * ユーザーの属性値一覧
   * @param selfEditableOnly true の場合、メンバー編集可（isSelfEditable=true）の属性のみ返す。
   *   本人向けエンドポイントで管理者専用属性を漏らさないために使用する。
   */
  async getUserAttributes(userId: string, selfEditableOnly = false) {
    const attributes = await this.prisma.memberAttribute.findMany({
      where: selfEditableOnly ? { isSelfEditable: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });

    const values = await this.prisma.memberAttributeValue.findMany({
      where: { userId },
    });
    const valueMap = new Map(values.map((v) => [v.attributeId, v.value]));

    return attributes.map((attr) => ({
      attributeId: attr.id,
      attributeName: attr.name,
      slug: attr.slug,
      type: attr.type,
      options: attr.options as string[] | null,
      isRequired: attr.isRequired,
      isSelfEditable: attr.isSelfEditable,
      value: valueMap.get(attr.id) ?? null,
    }));
  }

  /** ユーザーの属性値一括設定 */
  async setUserAttributes(userId: string, dto: SetAttributeValuesDto) {
    // ユーザー存在確認
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("ユーザーが見つかりません");

    const attributes = await this.prisma.memberAttribute.findMany();
    const attrMap = new Map(attributes.map((a) => [a.id, a]));

    // バリデーション
    for (const item of dto.values) {
      const attr = attrMap.get(item.attributeId);
      if (!attr) throw new BadRequestException(`属性ID ${item.attributeId} が見つかりません`);

      if (attr.isRequired && (item.value === null || item.value === "")) {
        throw new BadRequestException(`${attr.name} は必須です`);
      }
    }

    // upsert
    await this.prisma.$transaction(
      dto.values.map((item) => {
        if (item.value === null) {
          return this.prisma.memberAttributeValue.deleteMany({
            where: { userId, attributeId: item.attributeId },
          });
        }
        return this.prisma.memberAttributeValue.upsert({
          where: {
            userId_attributeId: { userId, attributeId: item.attributeId },
          },
          update: { value: item.value },
          create: { userId, attributeId: item.attributeId, value: item.value },
        });
      }),
    );

    return this.getUserAttributes(userId);
  }

  /** メンバー自身による属性値更新（isSelfEditable=true のみ許可） */
  async setSelfAttributes(userId: string, dto: SetAttributeValuesDto) {
    const attributes = await this.prisma.memberAttribute.findMany();
    const attrMap = new Map(attributes.map((a) => [a.id, a]));

    for (const item of dto.values) {
      const attr = attrMap.get(item.attributeId);
      if (!attr) throw new BadRequestException(`属性ID ${item.attributeId} が見つかりません`);

      if (!attr.isSelfEditable) {
        throw new BadRequestException(`${attr.name} はメンバーが編集できません`);
      }

      if (attr.isRequired && (item.value === null || item.value === "")) {
        throw new BadRequestException(`${attr.name} は必須です`);
      }
    }

    await this.prisma.$transaction(
      dto.values.map((item) => {
        if (item.value === null) {
          return this.prisma.memberAttributeValue.deleteMany({
            where: { userId, attributeId: item.attributeId },
          });
        }
        return this.prisma.memberAttributeValue.upsert({
          where: {
            userId_attributeId: { userId, attributeId: item.attributeId },
          },
          update: { value: item.value },
          create: { userId, attributeId: item.attributeId, value: item.value },
        });
      }),
    );

    return this.getUserAttributes(userId, true);
  }

  /** CSV エクスポート用データ取得 */
  async getExportData() {
    const attributes = await this.prisma.memberAttribute.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        rank: { select: { name: true } },
        attributeValues: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return { attributes, users };
  }
}
