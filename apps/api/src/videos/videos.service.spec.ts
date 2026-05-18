import { HttpStatus } from "@nestjs/common";
import { ErrorCode } from "@community-platform/shared";
import { BusinessException } from "@/common/exceptions";
import { VideosService } from "./videos.service";

type Jestify<T> = { [K in keyof T]: jest.Mock };

function makeDelegate(): Jestify<{
  findUnique: unknown;
  findFirst: unknown;
  findMany: unknown;
  count: unknown;
  create: unknown;
  update: unknown;
  delete: unknown;
  deleteMany: unknown;
  aggregate: unknown;
  upsert: unknown;
}> {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
    upsert: jest.fn(),
  };
}

describe("VideosService", () => {
  let prismaMock: {
    video: ReturnType<typeof makeDelegate>;
    videoTask: ReturnType<typeof makeDelegate>;
    videoTaskCompletion: ReturnType<typeof makeDelegate>;
    videoWatchProgress: ReturnType<typeof makeDelegate>;
    videoSeries: ReturnType<typeof makeDelegate>;
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let notificationsMock: { create: jest.Mock; createMany: jest.Mock };
  let service: VideosService;

  beforeEach(() => {
    prismaMock = {
      video: {
        ...makeDelegate(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      videoTask: makeDelegate(),
      videoTaskCompletion: makeDelegate(),
      videoWatchProgress: makeDelegate(),
      videoSeries: makeDelegate(),
      user: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(async (cb: unknown) => {
        if (typeof cb === "function") return (cb as (tx: unknown) => Promise<unknown>)(prismaMock);
        return Promise.all(cb as Promise<unknown>[]);
      }),
    };
    notificationsMock = { create: jest.fn(), createMany: jest.fn() };
    service = new VideosService(prismaMock as never, notificationsMock as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.video.findMany).toHaveBeenCalled();
      expect(prismaMock.video.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "動画" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("currentUserId を渡しても dispatcher の挙動は変わらない", async () => {
      await service.findAll({ search: "動画" }, "user-1");
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.video.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findOne: 動画詳細", () => {
    it("動画が無ければ BusinessException(NOT_FOUND / errors.not_found.video) を投げる", async () => {
      prismaMock.video.findFirst.mockResolvedValue(null);

      const promise = service.findOne("v-missing");
      await expect(promise).rejects.toBeInstanceOf(BusinessException);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });
  });

  describe("update: 動画更新", () => {
    it("動画が無ければ NOT_FOUND を投げる", async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(service.update("v-missing", {})).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });

    it("論理削除済み（deletedAt あり）なら NOT_FOUND を投げる", async () => {
      prismaMock.video.findUnique.mockResolvedValue({ id: "v-1", deletedAt: new Date() });

      await expect(service.update("v-1", {})).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });
  });

  describe("verifyPassword: パスワード検証", () => {
    it("動画が無ければ NOT_FOUND を投げる", async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(service.verifyPassword("v-missing", "1234")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });

    it("パスワードが設定されていなければ ok: true を返す", async () => {
      prismaMock.video.findUnique.mockResolvedValue({ passwordHash: null });

      await expect(service.verifyPassword("v-1", "1234")).resolves.toEqual({ ok: true });
    });

    it("パスワード不一致なら UNAUTHORIZED + errors.unauthorized_resource.video_password を投げる", async () => {
      // bcrypt.hash の結果は実物を使う（jest.mock しない）。"wrong" は "1234" と一致しない。
      const bcrypt = await import("bcrypt");
      const hash = await bcrypt.hash("1234", 4);
      prismaMock.video.findUnique.mockResolvedValue({ passwordHash: hash });

      await expect(service.verifyPassword("v-1", "wrong")).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
        messageKey: "errors.unauthorized_resource.video_password",
      });
    });
  });

  describe("updateTaskStatus: タスクステータス更新", () => {
    it("タスクが無ければ errors.not_found.video_task を投げる", async () => {
      prismaMock.videoTask.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTaskStatus("task-missing", "u-1", "completed"),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video_task",
      });
    });

    it("status=not_started なら completion レコードを削除する", async () => {
      prismaMock.videoTask.findUnique.mockResolvedValue({ id: "task-1" });
      prismaMock.videoTaskCompletion.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.updateTaskStatus("task-1", "u-1", "not_started");

      expect(result).toEqual({ status: "not_started" });
      expect(prismaMock.videoTaskCompletion.deleteMany).toHaveBeenCalledWith({
        where: { videoTaskId: "task-1", userId: "u-1" },
      });
    });
  });

  describe("getTaskProgress: タスク進捗", () => {
    it("動画が無ければ NOT_FOUND", async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(service.getTaskProgress("v-missing")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });
  });

  describe("sendTaskReminder: リマインド送信", () => {
    it("動画が無ければ NOT_FOUND（errors.not_found.video）", async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(
        service.sendTaskReminder("v-missing", "task-1", "actor", []),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });

    it("動画はあるがタスクが無ければ errors.not_found.video_task", async () => {
      prismaMock.video.findUnique.mockResolvedValue({ title: "動画A" });
      prismaMock.videoTask.findUnique.mockResolvedValue(null);

      await expect(
        service.sendTaskReminder("v-1", "task-missing", "actor", []),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video_task",
      });
    });
  });

  describe("resetStreamForReplace: ファイル差し替え準備", () => {
    it("動画が無ければ NOT_FOUND", async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(service.resetStreamForReplace("v-missing")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });

    it("論理削除済みなら NOT_FOUND", async () => {
      prismaMock.video.findUnique.mockResolvedValue({ id: "v-1", deletedAt: new Date() });

      await expect(service.resetStreamForReplace("v-1")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });
  });

  describe("BusinessException ヘルパの HTTP ステータス", () => {
    it("videoNotFound は statusCode 404 を持つ", async () => {
      prismaMock.video.findFirst.mockResolvedValue(null);
      try {
        await service.findOne("v-missing");
        fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(BusinessException);
        expect((err as BusinessException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });
});
