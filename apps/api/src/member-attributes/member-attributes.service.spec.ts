import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { MemberAttributesService } from "./member-attributes.service";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";

/**
 * 属性定義のフィクスチャ。
 * a1 はメンバー編集可（isSelfEditable=true）、a2 は管理者専用（isSelfEditable=false）。
 */
const SELF_EDITABLE_ATTR = {
  id: "a1",
  name: "ニックネーム",
  slug: "attr_1",
  type: "text",
  options: null,
  isRequired: false,
  isSelfEditable: true,
  sortOrder: 0,
};

const ADMIN_ONLY_ATTR = {
  id: "a2",
  name: "内部評価",
  slug: "attr_2",
  type: "text",
  options: null,
  isRequired: false,
  isSelfEditable: false,
  sortOrder: 1,
};

const ALL_ATTRS = [SELF_EDITABLE_ATTR, ADMIN_ONLY_ATTR];

describe("MemberAttributesService", () => {
  let service: MemberAttributesService;
  let prisma: {
    memberAttribute: { findMany: jest.Mock; findUnique: jest.Mock };
    memberAttributeValue: { findMany: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      memberAttribute: {
        // where.isSelfEditable が指定されたら実際に絞り込むことで、フィルタ挙動を検証できるようにする
        findMany: jest.fn((args?: { where?: { isSelfEditable?: boolean } }) => {
          const filter = args?.where?.isSelfEditable;
          const list =
            filter === undefined ? ALL_ATTRS : ALL_ATTRS.filter((a) => a.isSelfEditable === filter);
          return Promise.resolve(list);
        }),
        findUnique: jest.fn(),
      },
      memberAttributeValue: {
        findMany: jest.fn().mockResolvedValue([
          { attributeId: "a1", value: "たろう" },
          { attributeId: "a2", value: "S ランク" },
        ]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: "u1" }) },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberAttributesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: { getOrSet: jest.fn(), invalidate: jest.fn() } },
      ],
    }).compile();

    service = module.get(MemberAttributesService);
  });

  describe("getUserAttributes: 属性値一覧の取得", () => {
    it("selfEditableOnly を指定しない（管理者向け）と全属性を返す", async () => {
      const result = await service.getUserAttributes("u1");

      expect(result.map((a) => a.attributeId)).toEqual(["a1", "a2"]);
    });

    it("selfEditableOnly=true（本人向け）だとメンバー編集可の属性のみ返し、管理者専用属性を漏らさない", async () => {
      const result = await service.getUserAttributes("u1", true);

      expect(result.map((a) => a.attributeId)).toEqual(["a1"]);
      expect(result.some((a) => a.attributeId === "a2")).toBe(false);
      // Prisma クエリ自体に isSelfEditable フィルタが渡っていること
      expect(prisma.memberAttribute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isSelfEditable: true } }),
      );
    });
  });

  describe("setSelfAttributes: メンバー自身による属性値更新", () => {
    it("isSelfEditable=false の属性を更新しようとすると BadRequestException を投げる", async () => {
      await expect(
        service.setSelfAttributes("u1", { values: [{ attributeId: "a2", value: "A ランク" }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("編集可能な属性のみ更新でき、返り値に管理者専用属性を含めない", async () => {
      const result = await service.setSelfAttributes("u1", {
        values: [{ attributeId: "a1", value: "じろう" }],
      });

      expect(result.map((a) => a.attributeId)).toEqual(["a1"]);
      expect(result.some((a) => a.attributeId === "a2")).toBe(false);
    });
  });
});
