import { NotFoundException } from "@nestjs/common";
import { ErrorCode } from "@community-platform/shared";
import { LocalesService } from "./locales.service";

describe("LocalesService", () => {
  let prismaMock: {
    locale: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let cacheMock: { getOrSet: jest.Mock; invalidate: jest.Mock };
  let service: LocalesService;

  beforeEach(() => {
    prismaMock = {
      locale: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      // tx 引数として prisma モック自体を渡す（transaction の中身を実行する）
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => unknown) => Promise.resolve(fn(prismaMock))),
    };
    cacheMock = {
      getOrSet: jest
        .fn()
        .mockImplementation((_key: string, factory: () => unknown) => Promise.resolve(factory())),
      invalidate: jest.fn().mockResolvedValue(undefined),
    };
    service = new LocalesService(prismaMock as never, cacheMock as never);
  });

  describe("findAll: 一覧取得", () => {
    it("cache.getOrSet 経由で findMany を呼び、sortOrder 昇順で並ぶ", async () => {
      await service.findAll();
      expect(cacheMock.getOrSet).toHaveBeenCalledWith(
        "master:locales:all",
        expect.any(Function),
        expect.any(Number),
      );
      expect(prismaMock.locale.findMany).toHaveBeenCalledWith({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      });
    });
  });

  describe("findOne: 単一取得", () => {
    it("存在しないコードを指定すると NotFoundException を投げる", async () => {
      prismaMock.locale.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne("xx")).rejects.toThrow(NotFoundException);
    });

    it("存在するコードを指定するとレコードを返す", async () => {
      const locale = { code: "ja", nameNative: "日本語" };
      prismaMock.locale.findUnique.mockResolvedValueOnce(locale);
      await expect(service.findOne("ja")).resolves.toEqual(locale);
    });
  });

  describe("create: 新規作成", () => {
    it("既存コードと衝突した場合は LOCALE_ALREADY_EXISTS を投げる", async () => {
      prismaMock.locale.findUnique.mockResolvedValueOnce({ code: "en" });
      await expect(
        service.create({ code: "en", nameNative: "English", nameEn: "English" }),
      ).rejects.toMatchObject({
        code: ErrorCode.LOCALE_ALREADY_EXISTS,
      });
      expect(prismaMock.locale.create).not.toHaveBeenCalled();
    });

    it("isDefault=true で作成すると他の既定行を false にしてから作成する", async () => {
      prismaMock.locale.findUnique.mockResolvedValueOnce(null);
      prismaMock.locale.create.mockResolvedValueOnce({ code: "en", isDefault: true });

      await service.create({
        code: "en",
        nameNative: "English",
        nameEn: "English",
        isDefault: true,
      });

      expect(prismaMock.locale.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      expect(prismaMock.locale.create).toHaveBeenCalled();
      expect(cacheMock.invalidate).toHaveBeenCalledWith("master:locales:");
    });

    it("isDefault 未指定なら updateMany を呼ばない", async () => {
      prismaMock.locale.findUnique.mockResolvedValueOnce(null);
      prismaMock.locale.create.mockResolvedValueOnce({ code: "en" });

      await service.create({ code: "en", nameNative: "English", nameEn: "English" });

      expect(prismaMock.locale.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("update: 更新", () => {
    it("存在しないコードを更新すると NotFoundException を投げる", async () => {
      prismaMock.locale.findUnique.mockResolvedValueOnce(null);
      await expect(service.update("xx", { isEnabled: false })).rejects.toThrow(NotFoundException);
    });

    it("isDefault=true で更新すると自分以外の既定行を false にする", async () => {
      prismaMock.locale.findUnique.mockResolvedValueOnce({ code: "en", isDefault: false });
      prismaMock.locale.update.mockResolvedValueOnce({ code: "en", isDefault: true });

      await service.update("en", { isDefault: true });

      expect(prismaMock.locale.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true, NOT: { code: "en" } },
        data: { isDefault: false },
      });
    });
  });

  describe("remove: 削除", () => {
    it("既定ロケールは LOCALE_DEFAULT_REQUIRED で削除を拒否する", async () => {
      prismaMock.locale.findUnique.mockResolvedValueOnce({ code: "ja", isDefault: true });

      await expect(service.remove("ja")).rejects.toMatchObject({
        code: ErrorCode.LOCALE_DEFAULT_REQUIRED,
      });
      expect(prismaMock.locale.delete).not.toHaveBeenCalled();
    });

    it("既定でないロケールは削除でき、cache invalidate も呼ばれる", async () => {
      prismaMock.locale.findUnique.mockResolvedValue({ code: "en", isDefault: false });

      await service.remove("en");

      expect(prismaMock.locale.delete).toHaveBeenCalledWith({ where: { code: "en" } });
      expect(cacheMock.invalidate).toHaveBeenCalledWith("master:locales:");
    });
  });
});
