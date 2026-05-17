import { SurveysService } from "./surveys.service";

describe("SurveysService", () => {
  let prismaMock: {
    survey: { findMany: jest.Mock; count: jest.Mock };
    surveyResponse: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: SurveysService;

  beforeEach(() => {
    prismaMock = {
      survey: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      surveyResponse: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new SurveysService(prismaMock as never, {} as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.survey.findMany).toHaveBeenCalled();
      expect(prismaMock.survey.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "アンケート" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.survey.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findPending: 未回答アンケート一覧", () => {
    it("回答済みアンケートを除外する（respondentUserId で抽出 → notIn で渡す）", async () => {
      prismaMock.surveyResponse.findMany.mockResolvedValueOnce([
        { surveyId: "s1" },
        { surveyId: "s2" },
      ]);

      await service.findPending("user-1");

      const respArgs = prismaMock.surveyResponse.findMany.mock.calls[0][0];
      expect(respArgs.where.respondentUserId).toBe("user-1");

      const survArgs = prismaMock.survey.findMany.mock.calls[0][0];
      expect(survArgs.where.id).toEqual({ notIn: ["s1", "s2"] });
    });

    it("回答済みが 0 件なら id 条件は undefined（除外なし）", async () => {
      await service.findPending("user-1");

      const survArgs = prismaMock.survey.findMany.mock.calls[0][0];
      expect(survArgs.where.id).toBeUndefined();
    });

    it("active かつ未削除のみを対象にする", async () => {
      await service.findPending("user-1");

      const survArgs = prismaMock.survey.findMany.mock.calls[0][0];
      expect(survArgs.where.deletedAt).toBeNull();
      expect(survArgs.where.status).toBe("active");
    });

    it("OR 条件: eventId が null（コミュニティ全体）または event の参加者である", async () => {
      await service.findPending("user-1");

      const survArgs = prismaMock.survey.findMany.mock.calls[0][0];
      expect(survArgs.where.OR).toEqual([
        { eventId: null },
        {
          event: {
            participants: {
              some: {
                userId: "user-1",
                status: { in: ["applied", "attended"] },
              },
            },
          },
        },
      ]);
    });

    it("createdAt 降順で最大 10 件取得する", async () => {
      await service.findPending("user-1");

      const survArgs = prismaMock.survey.findMany.mock.calls[0][0];
      expect(survArgs.orderBy).toEqual({ createdAt: "desc" });
      expect(survArgs.take).toBe(10);
    });

    it("レスポンスは title / eventId / eventTitle / questionCount を含む形に整形される", async () => {
      prismaMock.survey.findMany.mockResolvedValueOnce([
        {
          id: "s1",
          title: "Q1",
          description: "desc",
          eventId: "e1",
          createdAt: new Date(),
          event: { id: "e1", title: "勉強会" },
          _count: { questions: 5 },
        },
        {
          id: "s2",
          title: "Q2",
          description: null,
          eventId: null,
          createdAt: new Date(),
          event: null,
          _count: { questions: 3 },
        },
      ]);

      const result = await service.findPending("user-1");

      expect(result[0]).toMatchObject({
        id: "s1",
        title: "Q1",
        eventId: "e1",
        eventTitle: "勉強会",
        questionCount: 5,
      });
      expect(result[1]).toMatchObject({
        id: "s2",
        eventId: null,
        eventTitle: null,
        questionCount: 3,
      });
    });
  });
});
