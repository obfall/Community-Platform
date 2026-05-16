// EventsService が `@nestjs/bullmq` を import するため、ESM の uuid 連鎖を避けるためのモック。
jest.mock("@nestjs/bullmq", () => ({
  InjectQueue: () => () => undefined,
}));

import { NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApplicationFormService } from "./application-form.service";

describe("ApplicationFormService", () => {
  let prismaMock: {
    event: { findUnique: jest.Mock };
    eventApplicationFormConfig: { findUnique: jest.Mock; upsert: jest.Mock };
    eventApplicationQuestion: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let eventsServiceMock: { scheduleReminder: jest.Mock; cancelReminder: jest.Mock };
  let service: ApplicationFormService;

  beforeEach(() => {
    prismaMock = {
      event: {
        findUnique: jest.fn().mockResolvedValue({ id: "e1" }),
      },
      eventApplicationFormConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      eventApplicationQuestion: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    eventsServiceMock = {
      scheduleReminder: jest.fn().mockResolvedValue(undefined),
      cancelReminder: jest.fn().mockResolvedValue(undefined),
    };
    service = new ApplicationFormService(prismaMock as never, eventsServiceMock as never);
  });

  describe("getForm: 申込フォーム設定取得（admin 用）", () => {
    it("イベントが存在しなければ NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(null);
      await expect(service.getForm("e1")).rejects.toThrow(NotFoundException);
    });

    it("config と questions（sortOrder 昇順）を並列取得して返す", async () => {
      const config = { eventId: "e1", askName: "required" };
      const questions = [{ id: "q1", sortOrder: 0 }];
      prismaMock.eventApplicationFormConfig.findUnique.mockResolvedValueOnce(config);
      prismaMock.eventApplicationQuestion.findMany.mockResolvedValueOnce(questions);

      const result = await service.getForm("e1");

      expect(result).toEqual({ config, questions });
      expect(prismaMock.eventApplicationQuestion.findMany).toHaveBeenCalledWith({
        where: { eventId: "e1" },
        orderBy: { sortOrder: "asc" },
      });
    });
  });

  describe("getFormPublic: 申込フォーム公開取得", () => {
    it("イベントが存在しなければ NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(null);
      await expect(service.getFormPublic("e1")).rejects.toThrow(NotFoundException);
    });

    it("config が無いときは askName=required を含むデフォルト config を返す", async () => {
      prismaMock.eventApplicationFormConfig.findUnique.mockResolvedValueOnce(null);
      prismaMock.eventApplicationQuestion.findMany.mockResolvedValueOnce([]);

      const result = await service.getFormPublic("e1");

      expect(result.config).toEqual({
        askName: "required",
        askNameKana: "hidden",
        askAffiliation: "hidden",
        askGender: "hidden",
        askAge: "hidden",
        askOccupation: "hidden",
        askNationality: "hidden",
      });
    });

    it("config がある場合はその値をそのまま返す", async () => {
      const config = {
        askName: "required",
        askNameKana: "optional",
        askAffiliation: "hidden",
        askGender: "hidden",
        askAge: "hidden",
        askOccupation: "hidden",
        askNationality: "hidden",
      };
      prismaMock.eventApplicationFormConfig.findUnique.mockResolvedValueOnce(config);
      prismaMock.eventApplicationQuestion.findMany.mockResolvedValueOnce([]);

      const result = await service.getFormPublic("e1");

      expect(result.config).toEqual(config);
    });
  });

  describe("upsertConfig: 設定の upsert + リマインダー再スケジュール", () => {
    beforeEach(() => {
      prismaMock.eventApplicationFormConfig.upsert.mockResolvedValue({
        eventId: "e1",
        reminderEnabled: true,
      });
    });

    it("イベントが存在しなければ NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(null);
      await expect(service.upsertConfig("e1", { askName: "required" } as never)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.eventApplicationFormConfig.upsert).not.toHaveBeenCalled();
    });

    it("reminderEnabled=true で upsert したら scheduleReminder が呼ばれる", async () => {
      prismaMock.eventApplicationFormConfig.upsert.mockResolvedValueOnce({
        eventId: "e1",
        reminderEnabled: true,
      });

      await service.upsertConfig("e1", { reminderEnabled: true } as never);

      expect(eventsServiceMock.scheduleReminder).toHaveBeenCalledWith("e1");
      expect(eventsServiceMock.cancelReminder).not.toHaveBeenCalled();
    });

    it("reminderEnabled=false で upsert したら cancelReminder が呼ばれる", async () => {
      prismaMock.eventApplicationFormConfig.upsert.mockResolvedValueOnce({
        eventId: "e1",
        reminderEnabled: false,
      });

      await service.upsertConfig("e1", { reminderEnabled: false } as never);

      expect(eventsServiceMock.cancelReminder).toHaveBeenCalledWith("e1");
      expect(eventsServiceMock.scheduleReminder).not.toHaveBeenCalled();
    });

    it("reminderHoursBefore のみ変更しても config.reminderEnabled が true なら scheduleReminder で再計算", async () => {
      prismaMock.eventApplicationFormConfig.upsert.mockResolvedValueOnce({
        eventId: "e1",
        reminderEnabled: true,
      });

      await service.upsertConfig("e1", { reminderHoursBefore: 48 } as never);

      expect(eventsServiceMock.scheduleReminder).toHaveBeenCalledWith("e1");
    });

    it("reminder 関連を含まない更新（visibility 設定のみ）では schedule/cancel どちらも呼ばれない", async () => {
      prismaMock.eventApplicationFormConfig.upsert.mockResolvedValueOnce({
        eventId: "e1",
        reminderEnabled: true,
      });

      await service.upsertConfig("e1", { askName: "optional" } as never);

      expect(eventsServiceMock.scheduleReminder).not.toHaveBeenCalled();
      expect(eventsServiceMock.cancelReminder).not.toHaveBeenCalled();
    });
  });

  describe("createQuestion: カスタム質問の追加", () => {
    it("イベントが存在しなければ NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createQuestion("e1", { label: "好きな色", questionType: "text" } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it("sortOrder 未指定かつ既存質問が無いなら 0 で採番される", async () => {
      prismaMock.eventApplicationQuestion.findFirst.mockResolvedValueOnce(null);
      prismaMock.eventApplicationQuestion.create.mockResolvedValueOnce({ id: "q1", sortOrder: 0 });

      await service.createQuestion("e1", { label: "好きな色", questionType: "text" } as never);

      expect(prismaMock.eventApplicationQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 0 }),
        }),
      );
    });

    it("sortOrder 未指定で既存最大値が 3 なら 4 で採番される", async () => {
      prismaMock.eventApplicationQuestion.findFirst.mockResolvedValueOnce({ sortOrder: 3 });
      prismaMock.eventApplicationQuestion.create.mockResolvedValueOnce({ id: "q1", sortOrder: 4 });

      await service.createQuestion("e1", { label: "好きな色", questionType: "text" } as never);

      expect(prismaMock.eventApplicationQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 4 }),
        }),
      );
    });

    it("sortOrder を明示指定すればその値で作成され、自動採番クエリは走らない", async () => {
      prismaMock.eventApplicationQuestion.create.mockResolvedValueOnce({ id: "q1", sortOrder: 10 });

      await service.createQuestion("e1", {
        label: "好きな色",
        questionType: "text",
        sortOrder: 10,
      } as never);

      expect(prismaMock.eventApplicationQuestion.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.eventApplicationQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 10 }),
        }),
      );
    });

    it("options 配列はそのまま JSON 値として渡される、isRequired 未指定なら false", async () => {
      const opts = [
        { value: "red", label: "赤" },
        { value: "blue", label: "青" },
      ];
      prismaMock.eventApplicationQuestion.findFirst.mockResolvedValueOnce(null);
      prismaMock.eventApplicationQuestion.create.mockResolvedValueOnce({ id: "q1" });

      await service.createQuestion("e1", {
        label: "色",
        questionType: "radio",
        options: opts,
      } as never);

      expect(prismaMock.eventApplicationQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            options: opts,
            isRequired: false,
          }),
        }),
      );
    });

    it("options 未指定なら data.options は undefined（DB 列はデフォルト null）", async () => {
      prismaMock.eventApplicationQuestion.findFirst.mockResolvedValueOnce(null);
      prismaMock.eventApplicationQuestion.create.mockResolvedValueOnce({ id: "q1" });

      await service.createQuestion("e1", {
        label: "自由記述",
        questionType: "textarea",
      } as never);

      const callArg = prismaMock.eventApplicationQuestion.create.mock.calls[0][0] as {
        data: { options?: unknown };
      };
      expect(callArg.data.options).toBeUndefined();
    });
  });

  describe("updateQuestion: 既存質問の更新", () => {
    it("質問が存在しなければ NotFoundException", async () => {
      prismaMock.eventApplicationQuestion.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateQuestion("q-missing", { label: "x" } as never)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.eventApplicationQuestion.update).not.toHaveBeenCalled();
    });

    it("options を含まない更新では options 列が data に含まれない", async () => {
      prismaMock.eventApplicationQuestion.findUnique.mockResolvedValueOnce({ id: "q1" });
      prismaMock.eventApplicationQuestion.update.mockResolvedValueOnce({ id: "q1" });

      await service.updateQuestion("q1", { label: "更新" } as never);

      const callArg = prismaMock.eventApplicationQuestion.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect("options" in callArg.data).toBe(false);
      expect(callArg.data.label).toBe("更新");
    });

    it("options=null（= 選択肢クリア）の場合は Prisma.JsonNull に変換される", async () => {
      prismaMock.eventApplicationQuestion.findUnique.mockResolvedValueOnce({ id: "q1" });
      prismaMock.eventApplicationQuestion.update.mockResolvedValueOnce({ id: "q1" });

      await service.updateQuestion("q1", { options: null } as never);

      const callArg = prismaMock.eventApplicationQuestion.update.mock.calls[0][0] as {
        data: { options: unknown };
      };
      expect(callArg.data.options).toBe(Prisma.JsonNull);
    });

    it("options 配列はそのまま JSON 値として渡される", async () => {
      const opts = [{ value: "a", label: "A" }];
      prismaMock.eventApplicationQuestion.findUnique.mockResolvedValueOnce({ id: "q1" });
      prismaMock.eventApplicationQuestion.update.mockResolvedValueOnce({ id: "q1" });

      await service.updateQuestion("q1", { options: opts } as never);

      const callArg = prismaMock.eventApplicationQuestion.update.mock.calls[0][0] as {
        data: { options: unknown };
      };
      expect(callArg.data.options).toEqual(opts);
    });
  });

  describe("deleteQuestion: 質問の削除", () => {
    it("質問が存在しなければ NotFoundException", async () => {
      prismaMock.eventApplicationQuestion.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteQuestion("q-missing")).rejects.toThrow(NotFoundException);
      expect(prismaMock.eventApplicationQuestion.delete).not.toHaveBeenCalled();
    });

    it("存在すれば delete が呼ばれる", async () => {
      prismaMock.eventApplicationQuestion.findUnique.mockResolvedValueOnce({ id: "q1" });
      prismaMock.eventApplicationQuestion.delete.mockResolvedValueOnce({ id: "q1" });

      await service.deleteQuestion("q1");

      expect(prismaMock.eventApplicationQuestion.delete).toHaveBeenCalledWith({
        where: { id: "q1" },
      });
    });
  });

  describe("reorderQuestions: 並び順の一括更新", () => {
    it("items 全てに対し update が並列に呼ばれた後、sortOrder 昇順で findMany が返る", async () => {
      prismaMock.eventApplicationQuestion.update.mockResolvedValue({});
      const sorted = [
        { id: "q1", sortOrder: 0 },
        { id: "q2", sortOrder: 1 },
        { id: "q3", sortOrder: 2 },
      ];
      prismaMock.eventApplicationQuestion.findMany.mockResolvedValueOnce(sorted);

      const result = await service.reorderQuestions("e1", {
        items: [
          { id: "q3", sortOrder: 2 },
          { id: "q1", sortOrder: 0 },
          { id: "q2", sortOrder: 1 },
        ],
      } as never);

      expect(prismaMock.eventApplicationQuestion.update).toHaveBeenCalledTimes(3);
      expect(prismaMock.eventApplicationQuestion.update).toHaveBeenCalledWith({
        where: { id: "q3" },
        data: { sortOrder: 2 },
      });
      expect(prismaMock.eventApplicationQuestion.findMany).toHaveBeenCalledWith({
        where: { eventId: "e1" },
        orderBy: { sortOrder: "asc" },
      });
      expect(result).toEqual(sorted);
    });

    it("items が空でも update は 0 回、findMany は 1 回呼ばれて空配列を返す", async () => {
      prismaMock.eventApplicationQuestion.findMany.mockResolvedValueOnce([]);

      const result = await service.reorderQuestions("e1", { items: [] } as never);

      expect(prismaMock.eventApplicationQuestion.update).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
