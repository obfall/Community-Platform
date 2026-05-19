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

  describe("recordView: 再生回数加算", () => {
    it("動画が無ければ NOT_FOUND を投げる", async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(service.recordView("v-missing")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });

    it("論理削除済み（deletedAt あり）なら NOT_FOUND を投げる", async () => {
      prismaMock.video.findUnique.mockResolvedValue({ id: "v-1", deletedAt: new Date() });

      await expect(service.recordView("v-1")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        messageKey: "errors.not_found.video",
      });
    });

    it("正常なら viewCount を +1 して { ok: true } を返す", async () => {
      prismaMock.video.findUnique.mockResolvedValue({ id: "v-1", deletedAt: null });
      prismaMock.video.update.mockResolvedValue({ id: "v-1" });

      await expect(service.recordView("v-1")).resolves.toEqual({ ok: true });
      expect(prismaMock.video.update).toHaveBeenCalledWith({
        where: { id: "v-1" },
        data: { viewCount: { increment: 1 } },
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

    it("tasks diff: 既存 1 件残し + 新規 1 件追加 + 旧 1 件削除 を正しく実行する", async () => {
      prismaMock.video.findUnique.mockResolvedValue({ id: "v-1", deletedAt: null });
      // findOne の戻り値（spec の関心外）。 deletedAt=null + publishStatus=published で内部 isPrivileged 経路を通す
      prismaMock.video.findFirst.mockResolvedValue({
        id: "v-1",
        title: "t",
        passwordHash: null,
        createdBy: { id: "u", name: "u", profile: null },
        instructors: [],
        attachments: [],
        tasks: [],
        series: null,
        seriesId: null,
        watchOrder: null,
      });
      // 既存 tasks: keep-1 と delete-1
      prismaMock.videoTask.findMany.mockResolvedValue([
        { id: "keep-1", videoId: "v-1" },
        { id: "delete-1", videoId: "v-1" },
      ]);
      prismaMock.videoTask.update.mockResolvedValue({ id: "keep-1" });
      prismaMock.videoTask.create.mockResolvedValue({ id: "new-1" });
      prismaMock.videoTask.deleteMany.mockResolvedValue({ count: 1 });

      await service.update("v-1", {
        tasks: [{ id: "keep-1", title: "残す" }, { title: "新規" }],
      });

      // 削除: incoming に無い "delete-1" だけが対象
      expect(prismaMock.videoTask.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["delete-1"] } },
      });
      // 更新: keep-1
      expect(prismaMock.videoTask.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "keep-1" } }),
      );
      // 新規: id 未指定の task が tx.videoTask.create で作られる
      expect(prismaMock.videoTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ videoId: "v-1", title: "新規" }),
        }),
      );
    });
  });

  describe("createForUpload: multipart アップロード経路", () => {
    beforeEach(() => {
      // findOne でない、create が返す動画
      prismaMock.video.create.mockResolvedValue({ id: "v-new", streamStatus: "uploading" });
    });

    it("最小フィールド（title のみ）で uploading 状態の動画を作る", async () => {
      await service.createForUpload("u-1", { title: "intro" });

      expect(prismaMock.video.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "intro",
            videoProvider: "r2_hls",
            videoExternalId: "pending",
            streamStatus: "uploading",
            publishStatus: "draft",
            createdByUserId: "u-1",
          }),
        }),
      );
    });

    it("instructors / attachmentFileIds / tasks の JSON 文字列をパースして createMany に渡す", async () => {
      await service.createForUpload("u-1", {
        title: "v",
        instructors: JSON.stringify([{ name: "講師A", affiliation: "X 社" }]),
        attachmentFileIds: JSON.stringify(["file-1", "file-2"]),
        tasks: JSON.stringify([{ title: "T1" }, { title: "T2" }]),
      });

      const args = prismaMock.video.create.mock.calls[0]![0] as {
        data: {
          instructors: { createMany: { data: unknown[] } };
          attachments: { createMany: { data: unknown[] } };
          tasks: { createMany: { data: unknown[] } };
        };
      };
      expect(args.data.instructors.createMany.data).toEqual([
        { userId: null, name: "講師A", affiliation: "X 社", sortOrder: 0 },
      ]);
      expect(args.data.attachments.createMany.data).toEqual([
        { fileId: "file-1", sortOrder: 0 },
        { fileId: "file-2", sortOrder: 1 },
      ]);
      expect(args.data.tasks.createMany.data).toEqual([
        { title: "T1", description: null, sortOrder: 0 },
        { title: "T2", description: null, sortOrder: 1 },
      ]);
    });

    it("不正な JSON は BusinessException(VALIDATION_FAILED, 400) を投げる", async () => {
      await expect(
        service.createForUpload("u-1", { title: "v", instructors: "{not-json" }),
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
        messageKey: "errors.validation.invalid_json",
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

    it("status=completed なら completedAt が set される", async () => {
      prismaMock.videoTask.findUnique.mockResolvedValue({ id: "task-1" });
      const now = new Date();
      prismaMock.videoTaskCompletion.upsert.mockResolvedValue({
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });

      const result = await service.updateTaskStatus("task-1", "u-1", "completed");

      expect(result.status).toBe("completed");
      expect(result.completedAt).toBe(now.toISOString());
      // upsert は { update, create } 双方で completedAt: Date を渡す
      const call = prismaMock.videoTaskCompletion.upsert.mock.calls[0]![0] as {
        update: { completedAt: Date | null };
        create: { completedAt: Date | null };
      };
      expect(call.update.completedAt).toBeInstanceOf(Date);
      expect(call.create.completedAt).toBeInstanceOf(Date);
    });

    it("status=in_progress なら completedAt は null", async () => {
      prismaMock.videoTask.findUnique.mockResolvedValue({ id: "task-1" });
      const now = new Date();
      prismaMock.videoTaskCompletion.upsert.mockResolvedValue({
        status: "in_progress",
        completedAt: null,
        updatedAt: now,
      });

      const result = await service.updateTaskStatus("task-1", "u-1", "in_progress");

      expect(result.status).toBe("in_progress");
      expect(result.completedAt).toBeNull();
      const call = prismaMock.videoTaskCompletion.upsert.mock.calls[0]![0] as {
        update: { completedAt: Date | null };
        create: { completedAt: Date | null };
      };
      expect(call.update.completedAt).toBeNull();
      expect(call.create.completedAt).toBeNull();
    });
  });

  describe("updateWatchProgress: 完了判定", () => {
    it("watchedSeconds が totalSeconds の 90% に達したら isCompleted: true を upsert する", async () => {
      prismaMock.videoWatchProgress.upsert.mockResolvedValue({});

      await service.updateWatchProgress("v-1", "u-1", {
        watchedSeconds: 90,
        lastPositionSeconds: 90,
        totalSeconds: 100,
      });

      const call = prismaMock.videoWatchProgress.upsert.mock.calls[0]![0] as {
        update: Record<string, unknown>;
        create: { isCompleted: boolean };
      };
      expect(call.create.isCompleted).toBe(true);
      expect(call.update.isCompleted).toBe(true);
    });

    it("watchedSeconds が totalSeconds の 89% なら isCompleted は false（create のみ false で書き込み、update では未設定）", async () => {
      prismaMock.videoWatchProgress.upsert.mockResolvedValue({});

      await service.updateWatchProgress("v-1", "u-1", {
        watchedSeconds: 89,
        lastPositionSeconds: 89,
        totalSeconds: 100,
      });

      const call = prismaMock.videoWatchProgress.upsert.mock.calls[0]![0] as {
        update: Record<string, unknown>;
        create: { isCompleted: boolean };
      };
      expect(call.create.isCompleted).toBe(false);
      // update 側は isCompleted を意図的に書かない（既に true なら true のままにする）
      expect(call.update.isCompleted).toBeUndefined();
    });

    it("totalSeconds=0 でも isCompleted は false（ゼロ除算ガード）", async () => {
      prismaMock.videoWatchProgress.upsert.mockResolvedValue({});

      await service.updateWatchProgress("v-1", "u-1", {
        watchedSeconds: 0,
        lastPositionSeconds: 0,
        totalSeconds: 0,
      });

      const call = prismaMock.videoWatchProgress.upsert.mock.calls[0]![0] as {
        create: { isCompleted: boolean };
      };
      expect(call.create.isCompleted).toBe(false);
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
