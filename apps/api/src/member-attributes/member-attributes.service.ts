import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { AttributeType } from "@prisma/client";
import type { CreateMemberAttributeDto } from "./dto/create-member-attribute.dto";
import type { UpdateMemberAttributeDto } from "./dto/update-member-attribute.dto";
import type { SetAttributeValuesDto } from "./dto/set-attribute-values.dto";
import type { ReorderAttributesDto } from "./dto/reorder-attributes.dto";

@Injectable()
export class MemberAttributesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 属性定義一覧 */
  async findAll() {
    return this.prisma.memberAttribute.findMany({
      orderBy: { sortOrder: "asc" },
    });
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

    const existing = await this.prisma.memberAttribute.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException("このスラッグは既に使用されています");

    return this.prisma.memberAttribute.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type,
        options: dto.options ?? undefined,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /** 属性定義更新（type/slug 変更不可） */
  async update(id: string, dto: UpdateMemberAttributeDto) {
    const existing = await this.prisma.memberAttribute.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("属性が見つかりません");

    return this.prisma.memberAttribute.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
      },
    });
  }

  /** 属性定義削除（値もカスケード削除） */
  async remove(id: string) {
    const existing = await this.prisma.memberAttribute.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("属性が見つかりません");

    await this.prisma.memberAttribute.delete({ where: { id } });
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
  }

  /** ユーザーの属性値一覧 */
  async getUserAttributes(userId: string) {
    const attributes = await this.prisma.memberAttribute.findMany({
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
