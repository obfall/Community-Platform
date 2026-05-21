import { BusinessException } from "@/common/exceptions";
import { ErrorCode } from "@community-platform/shared";
import { BoardCoreService } from "./board-core.service";
import { GLOBAL_BOARD_SCOPE } from "./board-scope.config";

type Jestify<T> = { [K in keyof T]: jest.Mock };

function makeDelegate(): Jestify<{
  findUnique: unknown;
  findMany: unknown;
  count: unknown;
  create: unknown;
  update: unknown;
  delete: unknown;
}> {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe("BoardCoreService", () => {
  let prismaMock: {
    boardCategory: ReturnType<typeof makeDelegate>;
    boardTopic: ReturnType<typeof makeDelegate>;
    boardTopicPost: ReturnType<typeof makeDelegate>;
    boardTopicPostComment: ReturnType<typeof makeDelegate>;
    boardLike: ReturnType<typeof makeDelegate>;
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: BoardCoreService;

  beforeEach(() => {
    prismaMock = {
      boardCategory: makeDelegate(),
      boardTopic: makeDelegate(),
      boardTopicPost: makeDelegate(),
      boardTopicPostComment: makeDelegate(),
      boardLike: makeDelegate(),
      user: { findUnique: jest.fn() },
      // $transaction は配列で渡された PrismaPromise を順に解決して結果配列を返す
      $transaction: jest.fn(async (ops) => Promise.all(ops as Promise<unknown>[])),
    };
    service = new BoardCoreService(prismaMock as never);
  });

  // ============================================================================
  // Categories
  // ============================================================================

  describe("findAllCategories: カテゴリ一覧整形", () => {
    it("delegate.findMany の結果を整形して返す", async () => {
      prismaMock.boardCategory.findMany.mockResolvedValue([
        {
          id: "cat-1",
          name: "お知らせ",
          description: "公式お知らせ",
          sortOrder: 0,
          allowTopicCreation: true,
          createdAt: new Date("2026-01-01"),
          _count: { topics: 3 },
        },
      ]);

      const result = await service.findAllCategories(GLOBAL_BOARD_SCOPE);

      expect(result).toEqual([
        {
          id: "cat-1",
          name: "お知らせ",
          description: "公式お知らせ",
          sortOrder: 0,
          allowTopicCreation: true,
          topicCount: 3,
          createdAt: new Date("2026-01-01"),
        },
      ]);
    });
  });

  describe("softDeleteCategory: 削除", () => {
    it("対象が見つかれば deletedAt をセットする", async () => {
      prismaMock.boardCategory.findUnique.mockResolvedValue({ id: "cat-1" });
      prismaMock.boardCategory.update.mockResolvedValue({});

      await service.softDeleteCategory(GLOBAL_BOARD_SCOPE, "cat-1");

      expect(prismaMock.boardCategory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cat-1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it("対象が無ければ BusinessException(NOT_FOUND) を投げる", async () => {
      prismaMock.boardCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.softDeleteCategory(GLOBAL_BOARD_SCOPE, "missing"),
      ).rejects.toBeInstanceOf(BusinessException);
      await expect(service.softDeleteCategory(GLOBAL_BOARD_SCOPE, "missing")).rejects.toMatchObject(
        { code: ErrorCode.NOT_FOUND },
      );
    });
  });

  // ============================================================================
  // Topics
  // ============================================================================

  describe("findOneTopic: トピック詳細", () => {
    const baseTopic = {
      id: "t-1",
      title: "テスト",
      body: "本文",
      isPinned: false,
      sortOrder: 0,
      postCount: 0,
      likeCount: 2,
      authorUserId: "u-1",
      author: { id: "u-1", name: "太郎" },
      category: { id: "cat-1", name: "雑談" },
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    it("トピックは isLiked を判定して返す", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue(baseTopic);
      prismaMock.boardLike.findUnique.mockResolvedValue({ id: "like-1" });

      const result = await service.findOneTopic(GLOBAL_BOARD_SCOPE, "u-1", "t-1");

      expect(result.isLiked).toBe(true);
    });

    it("見つからなければ NOT_FOUND", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneTopic(GLOBAL_BOARD_SCOPE, "u-1", "missing"),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("softDeleteTopic: 権限チェック", () => {
    it("作者本人なら削除できる", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue({ id: "t-1", authorUserId: "u-1" });
      prismaMock.boardTopic.update.mockResolvedValue({});

      await service.softDeleteTopic(GLOBAL_BOARD_SCOPE, "u-1", "t-1");

      expect(prismaMock.boardTopic.update).toHaveBeenCalled();
    });

    it("admin なら他人のトピックも削除できる", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue({ id: "t-1", authorUserId: "other" });
      prismaMock.user.findUnique.mockResolvedValue({ role: "admin" });
      prismaMock.boardTopic.update.mockResolvedValue({});

      await service.softDeleteTopic(GLOBAL_BOARD_SCOPE, "u-1", "t-1");

      expect(prismaMock.boardTopic.update).toHaveBeenCalled();
    });

    it("一般ユーザーが他人のトピックを削除しようとすると FORBIDDEN", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue({ id: "t-1", authorUserId: "other" });
      prismaMock.user.findUnique.mockResolvedValue({ role: "member" });

      await expect(service.softDeleteTopic(GLOBAL_BOARD_SCOPE, "u-1", "t-1")).rejects.toMatchObject(
        { code: ErrorCode.FORBIDDEN },
      );
    });
  });

  describe("toggleTopicPin: ピン留めトグル", () => {
    it("未ピン留めなら isPinned: true に切り替える", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue({ id: "t-1", isPinned: false });
      prismaMock.boardTopic.update.mockResolvedValue({ isPinned: true });

      const result = await service.toggleTopicPin(GLOBAL_BOARD_SCOPE, "t-1");

      expect(result).toEqual({ isPinned: true });
      expect(prismaMock.boardTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isPinned: true } }),
      );
    });
  });

  // ============================================================================
  // Likes
  // ============================================================================

  describe("toggleTopicLike: いいねトグル", () => {
    it("未 like なら like を作成し likeCount を increment", async () => {
      prismaMock.boardTopic.findUnique
        .mockResolvedValueOnce({ id: "t-1" }) // toggleTopicLike の存在確認
        .mockResolvedValueOnce({ likeCount: 6 }); // 不使用（update に select を入れている）
      prismaMock.boardLike.findUnique.mockResolvedValue(null);
      prismaMock.boardLike.create.mockResolvedValue({ id: "like-1" });
      prismaMock.boardTopic.update.mockResolvedValue({ likeCount: 6 });

      const result = await service.toggleTopicLike(GLOBAL_BOARD_SCOPE, "u-1", "t-1");

      expect(result).toEqual({ liked: true, likeCount: 6 });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.boardLike.create).toHaveBeenCalled();
      expect(prismaMock.boardTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { likeCount: { increment: 1 } } }),
      );
    });

    it("既 like なら like を削除し likeCount を decrement", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue({ id: "t-1" });
      prismaMock.boardLike.findUnique.mockResolvedValue({ id: "like-1" });
      prismaMock.boardLike.delete.mockResolvedValue({});
      prismaMock.boardTopic.update.mockResolvedValue({ likeCount: 4 });

      const result = await service.toggleTopicLike(GLOBAL_BOARD_SCOPE, "u-1", "t-1");

      expect(result).toEqual({ liked: false, likeCount: 4 });
      expect(prismaMock.boardLike.delete).toHaveBeenCalledWith({
        where: { id: "like-1" },
      });
      expect(prismaMock.boardTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { likeCount: { decrement: 1 } } }),
      );
    });

    it("対象トピックが見つからなければ NOT_FOUND", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleTopicLike(GLOBAL_BOARD_SCOPE, "u-1", "missing"),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  // ============================================================================
  // Posts
  // ============================================================================

  describe("createTopicPost: 投稿作成", () => {
    it("公開済みトピックに対して投稿を作成し postCount を increment（$transaction）", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue({ id: "t-1" });
      prismaMock.boardTopicPost.create.mockResolvedValue({
        id: "p-1",
        body: "投稿本文",
        likeCount: 0,
        commentCount: 0,
        author: { id: "u-1", name: "太郎" },
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      });
      prismaMock.boardTopic.update.mockResolvedValue({});

      const result = await service.createTopicPost(GLOBAL_BOARD_SCOPE, "u-1", "t-1", {
        body: "投稿本文",
      });

      expect(result.body).toBe("投稿本文");
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.boardTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { postCount: { increment: 1 } } }),
      );
    });

    it("トピックが下書き / 削除済みなら NOT_FOUND", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.createTopicPost(GLOBAL_BOARD_SCOPE, "u-1", "t-1", { body: "投稿" }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  // ============================================================================
  // Comments
  // ============================================================================

  describe("createTopicPostComment: コメント作成", () => {
    it("parentCommentId なしで作成し commentCount を increment", async () => {
      prismaMock.boardTopicPost.findUnique.mockResolvedValue({ id: "p-1" });
      prismaMock.boardTopicPostComment.create.mockResolvedValue({
        id: "c-1",
        body: "コメント",
        likeCount: 0,
        author: { id: "u-1", name: "太郎" },
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      });
      prismaMock.boardTopicPost.update.mockResolvedValue({});

      const result = await service.createTopicPostComment(GLOBAL_BOARD_SCOPE, "u-1", "p-1", {
        body: "コメント",
      });

      expect(result.body).toBe("コメント");
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.boardTopicPost.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { commentCount: { increment: 1 } } }),
      );
    });

    it("parentCommentId 指定時、親が見つからなければ NOT_FOUND", async () => {
      prismaMock.boardTopicPost.findUnique.mockResolvedValue({ id: "p-1" });
      prismaMock.boardTopicPostComment.findUnique.mockResolvedValue(null);

      await expect(
        service.createTopicPostComment(GLOBAL_BOARD_SCOPE, "u-1", "p-1", {
          body: "返信",
          parentCommentId: "missing",
        }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  // ============================================================================
  // 追加カバレッジ（review 指摘 M8 で網羅）
  // ============================================================================

  describe("createCategory: カテゴリ作成", () => {
    it("dto + userId + scope から data を組み立てて delegate.create を呼ぶ", async () => {
      prismaMock.boardCategory.create.mockResolvedValue({ id: "cat-1" });
      await service.createCategory(GLOBAL_BOARD_SCOPE, "u-1", {
        name: "新規",
        description: "説明",
        sortOrder: 5,
        allowTopicCreation: false,
      });
      expect(prismaMock.boardCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "新規",
          description: "説明",
          sortOrder: 5,
          allowTopicCreation: false,
          createdByUserId: "u-1",
        }),
      });
    });

    it("sortOrder / allowTopicCreation 未指定時のデフォルトが入る", async () => {
      prismaMock.boardCategory.create.mockResolvedValue({});
      await service.createCategory(GLOBAL_BOARD_SCOPE, "u-1", { name: "X" });
      expect(prismaMock.boardCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sortOrder: 0, allowTopicCreation: true }),
      });
    });
  });

  describe("updateCategory: カテゴリ更新", () => {
    it("対象がなければ NOT_FOUND", async () => {
      prismaMock.boardCategory.findUnique.mockResolvedValue(null);
      await expect(
        service.updateCategory(GLOBAL_BOARD_SCOPE, "missing", { name: "X" }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });

    it("dto に指定したフィールドだけが update.data に渡る", async () => {
      prismaMock.boardCategory.findUnique.mockResolvedValue({ id: "cat-1" });
      prismaMock.boardCategory.update.mockResolvedValue({});
      await service.updateCategory(GLOBAL_BOARD_SCOPE, "cat-1", { name: "新名" });
      expect(prismaMock.boardCategory.update).toHaveBeenCalledWith({
        where: { id: "cat-1" },
        data: { name: "新名" },
      });
    });
  });

  describe("reorderCategories: 並び替え", () => {
    it("items 配列を $transaction で一括更新する", async () => {
      const items = [
        { id: "c-1", sortOrder: 0 },
        { id: "c-2", sortOrder: 1 },
      ];
      await service.reorderCategories(GLOBAL_BOARD_SCOPE, items);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.boardCategory.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("findAllTopics: 一覧取得", () => {
    it("orderBy が [isPinned desc, sortOrder asc, createdAt desc] で呼ばれる", async () => {
      prismaMock.boardTopic.findMany.mockResolvedValue([]);
      prismaMock.boardTopic.count.mockResolvedValue(0);
      await service.findAllTopics(GLOBAL_BOARD_SCOPE, "u-1", {});
      expect(prismaMock.boardTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        }),
      );
    });

    it("query.categoryId があれば where に categoryId が入る", async () => {
      prismaMock.boardTopic.findMany.mockResolvedValue([]);
      prismaMock.boardTopic.count.mockResolvedValue(0);
      await service.findAllTopics(GLOBAL_BOARD_SCOPE, "u-1", { categoryId: "cat-1" });
      expect(prismaMock.boardTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: "cat-1" }),
        }),
      );
    });
  });

  describe("createTopic: トピック作成", () => {
    it("dto と userId が data に正しく入る", async () => {
      prismaMock.boardTopic.create.mockResolvedValue({
        id: "t-1",
        title: "X",
        body: "Y",
        isPinned: false,
        sortOrder: 0,
        postCount: 0,
        likeCount: 0,
        author: { id: "u-1", name: "太郎" },
        category: { id: "cat-1", name: "雑談" },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await service.createTopic(GLOBAL_BOARD_SCOPE, "u-1", {
        title: "X",
        body: "Y",
        categoryId: "cat-1",
      });
      expect(prismaMock.boardTopic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "X",
            body: "Y",
            categoryId: "cat-1",
            authorUserId: "u-1",
          }),
        }),
      );
    });
  });

  describe("updateTopic: 権限と差分更新", () => {
    it("非作者かつ admin/owner でなければ FORBIDDEN", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue({ id: "t-1", authorUserId: "other" });
      prismaMock.user.findUnique.mockResolvedValue({ role: "member" });
      await expect(
        service.updateTopic(GLOBAL_BOARD_SCOPE, "u-1", "t-1", { title: "X" }),
      ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });
    });
  });

  describe("reorderTopics: 並び替え", () => {
    it("$transaction で items を一括更新する", async () => {
      await service.reorderTopics(GLOBAL_BOARD_SCOPE, [
        { id: "t-1", sortOrder: 0 },
        { id: "t-2", sortOrder: 1 },
      ]);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.boardTopic.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("findAllTopicPosts: 投稿一覧", () => {
    it("トピックが見つからなければ NOT_FOUND", async () => {
      prismaMock.boardTopic.findUnique.mockResolvedValue(null);
      await expect(
        service.findAllTopicPosts(GLOBAL_BOARD_SCOPE, "u-1", "t-missing", {}),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("updateTopicPost: 投稿更新", () => {
    it("対象が無ければ NOT_FOUND（findPostForMutation 経由）", async () => {
      prismaMock.boardTopicPost.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTopicPost(GLOBAL_BOARD_SCOPE, "u-1", "p-missing", { body: "X" }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("softDeleteTopicPost: 投稿削除", () => {
    it("作者本人なら $transaction で deletedAt セット + postCount decrement", async () => {
      prismaMock.boardTopicPost.findUnique.mockResolvedValue({
        id: "p-1",
        authorUserId: "u-1",
        topicId: "t-1",
      });
      await service.softDeleteTopicPost(GLOBAL_BOARD_SCOPE, "u-1", "p-1");
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.boardTopicPost.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { deletedAt: expect.any(Date) } }),
      );
      expect(prismaMock.boardTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { postCount: { decrement: 1 } } }),
      );
    });
  });

  describe("findAllTopicPostComments: コメント一覧", () => {
    it("post が見つからなければ NOT_FOUND", async () => {
      prismaMock.boardTopicPost.findUnique.mockResolvedValue(null);
      await expect(
        service.findAllTopicPostComments(GLOBAL_BOARD_SCOPE, "u-1", "p-missing", {}),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("updateTopicPostComment: コメント更新", () => {
    it("対象が無ければ NOT_FOUND", async () => {
      prismaMock.boardTopicPostComment.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTopicPostComment(GLOBAL_BOARD_SCOPE, "u-1", "c-missing", { body: "X" }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("softDeleteTopicPostComment: コメント削除", () => {
    it("作者本人なら $transaction で deletedAt + commentCount decrement", async () => {
      prismaMock.boardTopicPostComment.findUnique.mockResolvedValue({
        id: "c-1",
        authorUserId: "u-1",
        postId: "p-1",
      });
      await service.softDeleteTopicPostComment(GLOBAL_BOARD_SCOPE, "u-1", "c-1");
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.boardTopicPost.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { commentCount: { decrement: 1 } } }),
      );
    });
  });

  describe("toggleTopicPostLike / toggleTopicPostCommentLike", () => {
    it("post が無ければ NOT_FOUND", async () => {
      prismaMock.boardTopicPost.findUnique.mockResolvedValue(null);
      await expect(
        service.toggleTopicPostLike(GLOBAL_BOARD_SCOPE, "u-1", "p-missing"),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });

    it("comment が無ければ NOT_FOUND", async () => {
      prismaMock.boardTopicPostComment.findUnique.mockResolvedValue(null);
      await expect(
        service.toggleTopicPostCommentLike(GLOBAL_BOARD_SCOPE, "u-1", "c-missing"),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });

    it("post の未 like → like 作成 + likeCount increment", async () => {
      prismaMock.boardTopicPost.findUnique.mockResolvedValue({ id: "p-1" });
      prismaMock.boardLike.findUnique.mockResolvedValue(null);
      prismaMock.boardTopicPost.update.mockResolvedValue({ likeCount: 3 });
      const result = await service.toggleTopicPostLike(GLOBAL_BOARD_SCOPE, "u-1", "p-1");
      expect(result).toEqual({ liked: true, likeCount: 3 });
    });
  });
});
