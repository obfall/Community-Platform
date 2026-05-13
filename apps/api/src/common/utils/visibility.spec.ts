import { VISIBILITY } from "./visibility";

/**
 * VISIBILITY は Prisma 版の where 句として一元管理されているが、
 * pgroonga 検索 SQL 内では同等の条件を Prisma.sql で別途記述している。
 * 両者がドリフトすると検索結果と通常一覧で公開範囲が食い違うため、
 * Prisma 版が想定の構造であることをここで固定し、SQL 側の手書き条件と
 * 突き合わせる際の参照点とする（SQL 側のチェックは各 service spec が担当）。
 */
describe("VISIBILITY: 各ドメインの公開条件（Prisma 版）", () => {
  describe("publishStatus 系（deletedAt + publishStatus=published）", () => {
    const expectedShape = { deletedAt: null, publishStatus: "published" };

    it("boardTopic", () => {
      expect(VISIBILITY.boardTopic).toEqual(expectedShape);
    });

    it("product", () => {
      expect(VISIBILITY.product).toEqual(expectedShape);
    });

    it("video", () => {
      expect(VISIBILITY.video).toEqual(expectedShape);
    });

    it("project", () => {
      expect(VISIBILITY.project).toEqual(expectedShape);
    });

    it("album", () => {
      expect(VISIBILITY.album).toEqual(expectedShape);
    });

    it("venue", () => {
      expect(VISIBILITY.venue).toEqual(expectedShape);
    });

    it("content", () => {
      expect(VISIBILITY.content).toEqual(expectedShape);
    });
  });

  describe("status 系（deletedAt + status 制約）", () => {
    it("event は deletedAt=null かつ status=recruiting（非管理者向け公開条件）", () => {
      expect(VISIBILITY.event).toEqual({
        deletedAt: null,
        status: "recruiting",
      });
    });

    it("survey は deletedAt=null かつ status=draft 以外", () => {
      expect(VISIBILITY.survey).toEqual({
        deletedAt: null,
        NOT: { status: "draft" },
      });
    });

    it("skillListing は deletedAt=null かつ status=active", () => {
      expect(VISIBILITY.skillListing).toEqual({
        deletedAt: null,
        status: "active",
      });
    });
  });

  describe("特殊系（user / faqArticle）", () => {
    it("user は deletedAt=null かつ status=active かつ publicInfo.publicStatus=public", () => {
      expect(VISIBILITY.user).toEqual({
        deletedAt: null,
        status: "active",
        publicInfo: { is: { publicStatus: "public" } },
      });
    });

    it("faqArticle は isPublished=true（論理削除なし）", () => {
      expect(VISIBILITY.faqArticle).toEqual({ isPublished: true });
    });
  });

  it("12 ドメインすべてが定義されている", () => {
    expect(Object.keys(VISIBILITY).sort()).toEqual(
      [
        "album",
        "boardTopic",
        "content",
        "event",
        "faqArticle",
        "product",
        "project",
        "skillListing",
        "survey",
        "user",
        "venue",
        "video",
      ].sort(),
    );
  });
});
