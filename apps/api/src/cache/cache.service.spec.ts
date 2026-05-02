import { CacheService } from "./cache.service";

describe("CacheService", () => {
  describe("REDIS_HOST 未設定: No-op フォールバック", () => {
    let service: CacheService;
    let originalRedisHost: string | undefined;

    beforeEach(() => {
      originalRedisHost = process.env.REDIS_HOST;
      delete process.env.REDIS_HOST;
      service = new CacheService();
    });

    afterEach(async () => {
      await service.onModuleDestroy();
      if (originalRedisHost !== undefined) {
        process.env.REDIS_HOST = originalRedisHost;
      } else {
        delete process.env.REDIS_HOST;
      }
    });

    it("getOrSet: 毎回 factory を実行する（キャッシュなしで素通し）", async () => {
      const factory = jest.fn().mockResolvedValue({ id: "v1" });
      const a = await service.getOrSet("test:key", factory, 60);
      const b = await service.getOrSet("test:key", factory, 60);
      expect(a).toEqual({ id: "v1" });
      expect(b).toEqual({ id: "v1" });
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("getOrSet: factory のエラーはそのまま伝播する", async () => {
      const factory = jest.fn().mockRejectedValue(new Error("DB down"));
      await expect(service.getOrSet("test:key", factory, 60)).rejects.toThrow("DB down");
    });

    it("invalidate: 例外を投げず完了する", async () => {
      await expect(service.invalidate("test:")).resolves.toBeUndefined();
    });

    it("del: 例外を投げず完了する", async () => {
      await expect(service.del("test:key")).resolves.toBeUndefined();
    });

    it("onModuleDestroy: 二重呼び出しでも例外を投げない", async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
