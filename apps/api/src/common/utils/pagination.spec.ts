import { extractPagination, buildPaginationMeta } from "./pagination";

describe("extractPagination: ページネーションパラメータ正規化", () => {
  describe("デフォルト値", () => {
    it("page も limit も未指定なら page=1, limit=20, skip=0", () => {
      const result = extractPagination({});
      expect(result).toEqual({ page: 1, limit: 20, skip: 0, offset: 0 });
    });

    it("defaultLimit を渡すとデフォルト limit が変わる", () => {
      const result = extractPagination({}, { defaultLimit: 50 });
      expect(result.limit).toBe(50);
    });
  });

  describe("正常系", () => {
    it("page=2, limit=10 なら skip=10", () => {
      const result = extractPagination({ page: 2, limit: 10 });
      expect(result).toEqual({ page: 2, limit: 10, skip: 10, offset: 10 });
    });

    it("page=5, limit=20 なら skip=80", () => {
      const result = extractPagination({ page: 5, limit: 20 });
      expect(result.skip).toBe(80);
    });

    it("skip と offset は同値", () => {
      const result = extractPagination({ page: 3, limit: 15 });
      expect(result.skip).toBe(result.offset);
    });
  });

  describe("文字列入力（@Query() 由来）", () => {
    it("文字列の page は数値に変換される", () => {
      const result = extractPagination({ page: "3", limit: "10" });
      expect(result).toEqual({ page: 3, limit: 10, skip: 20, offset: 20 });
    });

    it("数値変換できない文字列はデフォルトにフォールバック", () => {
      const result = extractPagination({ page: "abc", limit: "xyz" });
      expect(result).toEqual({ page: 1, limit: 20, skip: 0, offset: 0 });
    });

    it("空文字列はデフォルトにフォールバック", () => {
      const result = extractPagination({ page: "", limit: "" });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe("不正値のフォールバック", () => {
    it("page=0 は 1 にフォールバック", () => {
      const result = extractPagination({ page: 0 });
      expect(result.page).toBe(1);
    });

    it("page=-5 は 1 にフォールバック", () => {
      const result = extractPagination({ page: -5 });
      expect(result.page).toBe(1);
    });

    it("limit=0 はデフォルト値にフォールバック", () => {
      const result = extractPagination({ limit: 0 });
      expect(result.limit).toBe(20);
    });

    it("limit=-1 はデフォルト値にフォールバック", () => {
      const result = extractPagination({ limit: -1 });
      expect(result.limit).toBe(20);
    });

    it("page=NaN はデフォルト値にフォールバック", () => {
      const result = extractPagination({ page: NaN });
      expect(result.page).toBe(1);
    });
  });

  describe("上限クランプ", () => {
    it("limit=1000 は maxLimit=100 にクランプされる", () => {
      const result = extractPagination({ limit: 1000 });
      expect(result.limit).toBe(100);
    });

    it("maxLimit を渡すと上限が変わる", () => {
      const result = extractPagination({ limit: 500 }, { maxLimit: 200 });
      expect(result.limit).toBe(200);
    });

    it("limit が maxLimit 以下なら指定値が使われる", () => {
      const result = extractPagination({ limit: 50 }, { maxLimit: 100 });
      expect(result.limit).toBe(50);
    });
  });

  describe("小数の処理", () => {
    it("小数の page は切り捨てられる", () => {
      const result = extractPagination({ page: 3.7 });
      expect(result.page).toBe(3);
    });

    it("小数の limit も切り捨てられる", () => {
      const result = extractPagination({ limit: 15.9 });
      expect(result.limit).toBe(15);
    });

    it("文字列の小数 page も切り捨てられる", () => {
      const result = extractPagination({ page: "3.7" });
      expect(result.page).toBe(3);
    });

    it("文字列の小数 limit も切り捨てられる", () => {
      const result = extractPagination({ limit: "15.9" });
      expect(result.limit).toBe(15);
    });

    it("文字列 0.5（1 未満）は fallback", () => {
      const result = extractPagination({ page: "0.5", limit: "0.9" });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});

describe("buildPaginationMeta: ページネーション meta 生成", () => {
  describe("基本動作", () => {
    it("total=100, page=1, limit=20 → totalPages=5, hasNextPage=true, hasPreviousPage=false", () => {
      const meta = buildPaginationMeta(100, 1, 20);
      expect(meta).toEqual({
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it("中間ページなら hasNextPage と hasPreviousPage が両方 true", () => {
      const meta = buildPaginationMeta(100, 3, 20);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPreviousPage).toBe(true);
    });

    it("最終ページなら hasNextPage が false", () => {
      const meta = buildPaginationMeta(100, 5, 20);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(true);
    });
  });

  describe("境界値", () => {
    it("total=0 なら totalPages=0、両方の hasXxx が false", () => {
      const meta = buildPaginationMeta(0, 1, 20);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(false);
    });

    it("total が limit より小さい場合は totalPages=1", () => {
      const meta = buildPaginationMeta(5, 1, 20);
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNextPage).toBe(false);
    });

    it("total が limit と等しい場合は totalPages=1", () => {
      const meta = buildPaginationMeta(20, 1, 20);
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNextPage).toBe(false);
    });

    it("total が limit + 1 なら totalPages=2", () => {
      const meta = buildPaginationMeta(21, 1, 20);
      expect(meta.totalPages).toBe(2);
      expect(meta.hasNextPage).toBe(true);
    });

    it("端数があると totalPages は切り上げ", () => {
      const meta = buildPaginationMeta(101, 1, 20);
      expect(meta.totalPages).toBe(6);
    });
  });
});
