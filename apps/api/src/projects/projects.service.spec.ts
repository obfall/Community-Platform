import { ProjectsService } from "./projects.service";

const ACTOR_ID = "00000000-0000-0000-0000-000000000001";

describe("ProjectsService", () => {
  let prismaMock: {
    project: { findMany: jest.Mock; count: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: ProjectsService;

  beforeEach(() => {
    prismaMock = {
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new ProjectsService(prismaMock as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({}, "admin", ACTOR_ID);
      expect(prismaMock.project.findMany).toHaveBeenCalled();
      expect(prismaMock.project.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "プロジェクト" }, "admin", ACTOR_ID);
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" }, "admin", ACTOR_ID);
      expect(prismaMock.project.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findAll: 一覧の cancelled / completed 制御", () => {
    it("admin は status クエリをそのまま尊重する（cancelled も指定可）", async () => {
      await service.findAll({ status: "cancelled" }, "admin", ACTOR_ID);
      const args = prismaMock.project.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("cancelled");
      expect(args.where.OR).toBeUndefined();
    });

    it("admin は completed の指定も尊重する", async () => {
      await service.findAll({ status: "completed" }, "admin", ACTOR_ID);
      const args = prismaMock.project.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("completed");
    });

    it("owner も status クエリをそのまま尊重する", async () => {
      await service.findAll({ status: "cancelled" }, "owner", ACTOR_ID);
      const args = prismaMock.project.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("cancelled");
    });

    it("member は status 未指定なら『自分が参加中』OR『終了/中止以外』で取得", async () => {
      await service.findAll({}, "member", ACTOR_ID);
      const args = prismaMock.project.findMany.mock.calls[0][0];
      expect(args.where.OR).toEqual([
        { members: { some: { userId: ACTOR_ID, status: "active" } } },
        { status: { notIn: ["cancelled", "completed"] } },
      ]);
    });

    it("member は隠し対象以外の status 指定は尊重する", async () => {
      await service.findAll({ status: "in_progress" }, "member", ACTOR_ID);
      const args = prismaMock.project.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("in_progress");
      expect(args.where.OR).toBeUndefined();
    });

    it("member が cancelled 指定時は『自分が参加中』に限定される", async () => {
      await service.findAll({ status: "cancelled" }, "member", ACTOR_ID);
      const args = prismaMock.project.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("cancelled");
      expect(args.where.members).toEqual({ some: { userId: ACTOR_ID, status: "active" } });
    });

    it("member が completed 指定時も『自分が参加中』に限定される", async () => {
      await service.findAll({ status: "completed" }, "member", ACTOR_ID);
      const args = prismaMock.project.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("completed");
      expect(args.where.members).toEqual({ some: { userId: ACTOR_ID, status: "active" } });
    });
  });

  describe("findAll: pgroonga 検索でも同じ制御が効く", () => {
    it("admin が search すると WHERE に除外条件は入らない", async () => {
      await service.findAll({ search: "プロジェクト" }, "admin", ACTOR_ID);
      const call = prismaMock.$queryRaw.mock.calls[0][0];
      const sqlText = (call.strings ?? []).join("");
      expect(sqlText).not.toMatch(/status NOT IN/);
    });

    it("member が search すると『自分が参加中』OR『終了/中止以外』が WHERE に入る", async () => {
      await service.findAll({ search: "プロジェクト" }, "member", ACTOR_ID);
      const call = prismaMock.$queryRaw.mock.calls[0][0];
      const sqlText = (call.strings ?? []).join("");
      expect(sqlText).toMatch(/EXISTS \(SELECT 1 FROM project_members/);
      expect(sqlText).toMatch(/status NOT IN \('cancelled'::"ProjectStatus"/);
    });

    it("member が search + completed 指定時は『参加中』限定の AND になる", async () => {
      await service.findAll({ search: "プロジェクト", status: "completed" }, "member", ACTOR_ID);
      const call = prismaMock.$queryRaw.mock.calls[0][0];
      const sqlText = (call.strings ?? []).join("");
      expect(sqlText).toMatch(/status = /);
      expect(sqlText).toMatch(/EXISTS \(SELECT 1 FROM project_members/);
    });

    it("pgroonga 検索は searchColumns に tags_text を含む", async () => {
      await service.findAll({ search: "プロジェクト" }, "admin", ACTOR_ID);
      const call = prismaMock.$queryRaw.mock.calls[0][0];
      const sqlText = (call.strings ?? []).join("");
      expect(sqlText).toContain("tags_text");
    });
  });

  describe("findAll: tagId による絞り込み", () => {
    it("通常一覧経路では where.tags に絞り込み条件を積む", async () => {
      const tagId = "11111111-1111-1111-1111-111111111111";
      await service.findAll({ tagId }, "admin", ACTOR_ID);
      const args = prismaMock.project.findMany.mock.calls[0][0];
      expect(args.where.tags).toEqual({ some: { tagId } });
    });

    it("pgroonga 検索でも tagId が project_tags の EXISTS 条件として入る", async () => {
      const tagId = "22222222-2222-2222-2222-222222222222";
      await service.findAll({ search: "プロジェクト", tagId }, "admin", ACTOR_ID);
      const call = prismaMock.$queryRaw.mock.calls[0][0];
      const sqlText = (call.strings ?? []).join("");
      expect(sqlText).toMatch(/EXISTS \(SELECT 1 FROM project_tags/);
    });
  });
});
