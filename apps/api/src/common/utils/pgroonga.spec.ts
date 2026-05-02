import { Prisma } from "@prisma/client";
import { escapePgroongaQuery, pgroongaSearchAndFetch, PGROONGA_MAX_LIMIT } from "./pgroonga";

describe("escapePgroongaQuery: pgroonga クエリ構文のエスケープ", () => {
  describe("空入力", () => {
    it("undefined を渡すと空文字を返す", () => {
      expect(escapePgroongaQuery(undefined)).toBe("");
    });

    it("null を渡すと空文字を返す", () => {
      expect(escapePgroongaQuery(null)).toBe("");
    });

    it("空文字を渡すと空文字を返す", () => {
      expect(escapePgroongaQuery("")).toBe("");
    });

    it("空白のみの文字列は空文字として扱われる", () => {
      expect(escapePgroongaQuery("   ")).toBe("");
    });
  });

  describe("通常文字列", () => {
    it("通常の日本語はそのまま返る", () => {
      expect(escapePgroongaQuery("勉強会")).toBe("勉強会");
    });

    it("英数字はそのまま返る", () => {
      expect(escapePgroongaQuery("workshop 2026")).toBe("workshop 2026");
    });

    it("前後の空白はトリムされる", () => {
      expect(escapePgroongaQuery("  勉強会  ")).toBe("勉強会");
    });

    it("連続する空白は 1 つにまとめられる", () => {
      expect(escapePgroongaQuery("オンライン   勉強会")).toBe("オンライン 勉強会");
    });
  });

  describe("バックスラッシュエスケープ対象", () => {
    it("ダブルクオートはバックスラッシュでエスケープされる", () => {
      expect(escapePgroongaQuery('say "hello"')).toBe('say \\"hello\\"');
    });

    it("バックスラッシュ自体もエスケープされる", () => {
      expect(escapePgroongaQuery("path\\to")).toBe("path\\\\to");
    });
  });

  describe("空白置換対象（pgroonga 構文記号）", () => {
    it("プラス記号は空白に置き換えられる", () => {
      expect(escapePgroongaQuery("勉強+会")).toBe("勉強 会");
    });

    it("マイナス記号は空白に置き換えられる", () => {
      expect(escapePgroongaQuery("勉強-会")).toBe("勉強 会");
    });

    it("括弧は空白に置き換えられる", () => {
      expect(escapePgroongaQuery("勉強(会)")).toBe("勉強 会");
    });

    it("波括弧は空白に置き換えられる", () => {
      expect(escapePgroongaQuery("勉強{会}")).toBe("勉強 会");
    });

    it("角括弧は空白に置き換えられる", () => {
      expect(escapePgroongaQuery("勉強[会]")).toBe("勉強 会");
    });

    it("ワイルドカード（* ?）は空白に置き換えられる", () => {
      expect(escapePgroongaQuery("勉強*会?")).toBe("勉強 会");
    });

    it("コロン・スラッシュは空白に置き換えられる", () => {
      expect(escapePgroongaQuery("title:value/path")).toBe("title value path");
    });

    it("複数の特殊文字を組み合わせても安全", () => {
      expect(escapePgroongaQuery("(勉強会) +オンライン -アーカイブ")).toBe(
        "勉強会 オンライン アーカイブ",
      );
    });
  });

  describe("インジェクション系の入力", () => {
    it("ダブルクオートを含むクエリはエスケープされる（pgroonga 構文の string 終端を防ぐ）", () => {
      const result = escapePgroongaQuery('" OR true --');
      expect(result).toContain('\\"');
      expect(result).not.toContain('"OR'); // クオート直後の OR がリテラル化
    });
  });
});

describe("pgroongaSearchAndFetch: 検索ヘルパ本体", () => {
  type Hit = { id: string; score: number; titleHighlighted: string; snippetHighlighted: string };

  function makePrismaMock(hits: Hit[], totalRows: Array<{ count: bigint }>) {
    const calls: Prisma.Sql[] = [];
    const queryRaw = jest.fn((sql: Prisma.Sql) => {
      calls.push(sql);
      // 1 回目: hits, 2 回目: totalRows
      return Promise.resolve(calls.length === 1 ? hits : totalRows);
    });
    return { prisma: { $queryRaw: queryRaw as never }, calls, queryRaw };
  }

  const baseOpts = {
    table: "albums",
    searchColumns: ["title", "description"],
    titleColumn: "title",
    snippetColumn: "description" as string | null,
    escaped: "勉強会",
    where: Prisma.sql`deleted_at IS NULL`,
    limit: 20,
    offset: 0,
  };

  describe("識別子バリデーション（入口で fail-fast）", () => {
    it("table 名に不正識別子が混ざると Error", async () => {
      const { prisma } = makePrismaMock([], [{ count: 0n }]);
      await expect(
        pgroongaSearchAndFetch({
          ...baseOpts,
          prisma,
          table: "albums; DROP TABLE users",
          fetchByIds: () => Promise.resolve([]),
        }),
      ).rejects.toThrow(/Unsafe SQL identifier/);
    });

    it("searchColumns に不正識別子が混ざると Error", async () => {
      const { prisma } = makePrismaMock([], [{ count: 0n }]);
      await expect(
        pgroongaSearchAndFetch({
          ...baseOpts,
          prisma,
          searchColumns: ["title", "description; --"],
          fetchByIds: () => Promise.resolve([]),
        }),
      ).rejects.toThrow(/Unsafe SQL identifier/);
    });

    it("titleColumn が不正だと Error", async () => {
      const { prisma } = makePrismaMock([], [{ count: 0n }]);
      await expect(
        pgroongaSearchAndFetch({
          ...baseOpts,
          prisma,
          titleColumn: "title)",
          fetchByIds: () => Promise.resolve([]),
        }),
      ).rejects.toThrow(/Unsafe SQL identifier/);
    });

    it("snippetColumn が null なら検証されない（snippet 無しのケース）", async () => {
      const { prisma } = makePrismaMock([], [{ count: 0n }]);
      await expect(
        pgroongaSearchAndFetch({
          ...baseOpts,
          prisma,
          snippetColumn: null,
          fetchByIds: () => Promise.resolve([]),
        }),
      ).resolves.toBeDefined();
    });
  });

  describe("hits 0 件の早期 return", () => {
    it("$queryRaw が空配列を返したら fetchByIds は呼ばれない", async () => {
      const fetchByIds = jest.fn(() => Promise.resolve([]));
      const { prisma } = makePrismaMock([], [{ count: 0n }]);
      const result = await pgroongaSearchAndFetch({
        ...baseOpts,
        prisma,
        fetchByIds,
      });
      expect(fetchByIds).not.toHaveBeenCalled();
      expect(result.records).toEqual([]);
      expect(result.hitsById.size).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe("通常の検索フロー", () => {
    const hits: Hit[] = [
      { id: "id-1", score: 5, titleHighlighted: "<span>foo</span>", snippetHighlighted: "" },
      { id: "id-2", score: 3, titleHighlighted: "<span>bar</span>", snippetHighlighted: "snip" },
    ];

    it("score 順で fetchByIds が呼ばれ、records は score 順", async () => {
      const fetchByIds = jest.fn((ids: string[]) =>
        Promise.resolve(ids.map((id) => ({ id, name: `name-${id}` })).reverse()),
      );
      const { prisma } = makePrismaMock(hits, [{ count: 2n }]);
      const result = await pgroongaSearchAndFetch({
        ...baseOpts,
        prisma,
        fetchByIds,
      });
      expect(fetchByIds).toHaveBeenCalledWith(["id-1", "id-2"]);
      // fetchByIds 側が逆順で返しても hits の score 順に並び直されること
      expect(result.records.map((r) => r.id)).toEqual(["id-1", "id-2"]);
    });

    it("hitsById は id をキーに hit 全体を保持", async () => {
      const { prisma } = makePrismaMock(hits, [{ count: 2n }]);
      const result = await pgroongaSearchAndFetch({
        ...baseOpts,
        prisma,
        fetchByIds: (ids) => Promise.resolve(ids.map((id) => ({ id }))),
      });
      expect(result.hitsById.get("id-1")?.titleHighlighted).toBe("<span>foo</span>");
      expect(result.hitsById.get("id-2")?.snippetHighlighted).toBe("snip");
    });

    it("total は count クエリの結果を Number 化", async () => {
      const { prisma } = makePrismaMock(hits, [{ count: 42n }]);
      const result = await pgroongaSearchAndFetch({
        ...baseOpts,
        prisma,
        fetchByIds: (ids) => Promise.resolve(ids.map((id) => ({ id }))),
      });
      expect(result.total).toBe(42);
    });

    it("fetchByIds 側で id がフィルタされた場合、records から欠落して整合性が保たれる", async () => {
      const { prisma } = makePrismaMock(hits, [{ count: 2n }]);
      const result = await pgroongaSearchAndFetch({
        ...baseOpts,
        prisma,
        fetchByIds: () => Promise.resolve([{ id: "id-1" }]), // id-2 は権限等でフィルタされた想定
      });
      expect(result.records.map((r) => r.id)).toEqual(["id-1"]);
    });
  });

  describe("limit クランプ（多重防御）", () => {
    it("limit が PGROONGA_MAX_LIMIT を超えると上限にクランプされる", async () => {
      const { prisma, calls } = makePrismaMock([], [{ count: 0n }]);
      await pgroongaSearchAndFetch({
        ...baseOpts,
        prisma,
        limit: PGROONGA_MAX_LIMIT + 50,
        fetchByIds: () => Promise.resolve([]),
      });
      // SQL 1 回目（hits 取得）の Prisma.Sql の values に limit 値が含まれる
      const firstCall = calls[0]!;
      const limitParam = firstCall.values.find((v) => v === PGROONGA_MAX_LIMIT);
      expect(limitParam).toBe(PGROONGA_MAX_LIMIT);
    });

    it("limit=0 や負値は最低 1 にクランプされる", async () => {
      const { prisma, calls } = makePrismaMock([], [{ count: 0n }]);
      await pgroongaSearchAndFetch({
        ...baseOpts,
        prisma,
        limit: -10,
        fetchByIds: () => Promise.resolve([]),
      });
      expect(calls[0]!.values).toContain(1);
    });
  });
});
