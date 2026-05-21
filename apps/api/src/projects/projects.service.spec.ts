import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProjectsService } from "./projects.service";

const ACTOR_ID = "00000000-0000-0000-0000-000000000001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000999";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000abc";

describe("ProjectsService", () => {
  let prismaMock: {
    project: { findMany: jest.Mock; count: jest.Mock; findUnique?: jest.Mock; update?: jest.Mock };
    projectMember?: { findFirst: jest.Mock; create?: jest.Mock; update?: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction?: jest.Mock;
  };
  let service: ProjectsService;

  beforeEach(() => {
    prismaMock = {
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      projectMember: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
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

  describe("メンバー管理の権限チェック（assertCanManageProjectMembers 経由）", () => {
    beforeEach(() => {
      // findOne 経路で参照される include 全部を含むダミー project
      prismaMock.project.findUnique!.mockResolvedValue({
        id: PROJECT_ID,
        deletedAt: null,
        members: [],
        tags: [],
        category: null,
        event: null,
        createdByUser: { id: ACTOR_ID, name: "actor" },
        _count: { members: 0, threads: 0, tasks: 0 },
      });
      prismaMock.projectMember!.findFirst.mockResolvedValue(null);
      prismaMock.projectMember!.update.mockResolvedValue(undefined);
      prismaMock.projectMember!.create.mockResolvedValue(undefined);
      prismaMock.project.update!.mockResolvedValue(undefined);
      prismaMock.$transaction!.mockImplementation((cb: (tx: unknown) => Promise<unknown>) =>
        cb(prismaMock),
      );
    });

    it("システム admin は project member 検索なしで update を通過する", async () => {
      await service.update(PROJECT_ID, { name: "更新" }, ACTOR_ID, "admin");
      expect(prismaMock.projectMember!.findFirst).not.toHaveBeenCalled();
    });

    it("システム owner も project member 検索なしで update を通過する", async () => {
      await service.update(PROJECT_ID, { name: "更新" }, ACTOR_ID, "owner");
      expect(prismaMock.projectMember!.findFirst).not.toHaveBeenCalled();
    });

    it("一般ロールは active かつ role=admin の ProjectMember レコードが無いと ForbiddenException", async () => {
      prismaMock.projectMember!.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.update(PROJECT_ID, { name: "x" }, ACTOR_ID, "member"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("一般ロールでも当該プロジェクトのホスト（role=admin）なら update できる", async () => {
      prismaMock.projectMember!.findFirst.mockResolvedValueOnce({ id: "pm-host" });
      await service.update(PROJECT_ID, { name: "更新" }, ACTOR_ID, "member");
      expect(prismaMock.projectMember!.findFirst).toHaveBeenCalledWith({
        where: { projectId: PROJECT_ID, userId: ACTOR_ID, status: "active", role: "admin" },
        select: { id: true },
      });
    });

    it("remove も同じ権限チェックを経由する（ホスト以外は Forbidden）", async () => {
      prismaMock.projectMember!.findFirst.mockResolvedValueOnce(null);
      await expect(service.remove(PROJECT_ID, ACTOR_ID, "member")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("addMember もホスト権限が必要（system admin はバイパス）", async () => {
      await service.addMember(PROJECT_ID, OTHER_USER_ID, "member", ACTOR_ID, "admin");
      expect(prismaMock.projectMember!.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.projectMember!.create).toHaveBeenCalledWith({
        data: { projectId: PROJECT_ID, userId: OTHER_USER_ID, role: "member" },
      });
    });

    it("updateMemberRole もホスト権限が必要", async () => {
      // 1 回目: assertCanManageProjectMembers 用（ホストとして許可）
      // 2 回目: 対象メンバーの存在チェック（見つかる）
      prismaMock
        .projectMember!.findFirst.mockResolvedValueOnce({ id: "pm-host" })
        .mockResolvedValueOnce({ id: "pm-target" });
      await service.updateMemberRole(PROJECT_ID, OTHER_USER_ID, "admin", ACTOR_ID, "member");
      expect(prismaMock.projectMember!.update).toHaveBeenCalledWith({
        where: { id: "pm-target" },
        data: { role: "admin" },
      });
    });

    it("updateMemberRole で対象メンバーが居なければ NotFoundException", async () => {
      prismaMock
        .projectMember!.findFirst.mockResolvedValueOnce({ id: "pm-host" })
        .mockResolvedValueOnce(null);
      await expect(
        service.updateMemberRole(PROJECT_ID, OTHER_USER_ID, "admin", ACTOR_ID, "member"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("removeMember で権限通過後に対象メンバーが居なければ NotFoundException", async () => {
      // 1 回目: 権限チェックを通過、2 回目: 対象メンバー検索で null
      prismaMock
        .projectMember!.findFirst.mockResolvedValueOnce({ id: "pm-host" })
        .mockResolvedValueOnce(null);
      await expect(
        service.removeMember(PROJECT_ID, OTHER_USER_ID, undefined, ACTOR_ID, "member"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("joinByToken: 招待リンク経由の参加", () => {
    const TOKEN = "abcdef0123456789";

    beforeEach(() => {
      // joinByToken は project / projectMember を別 mock 形状で扱う
      prismaMock.project.findUnique!.mockResolvedValue({
        id: PROJECT_ID,
        deletedAt: null,
        members: [],
        tags: [],
        category: null,
        event: null,
        createdByUser: { id: ACTOR_ID, name: "actor" },
        _count: { members: 0, threads: 0, tasks: 0 },
      });
    });

    it("inviteLinkEnabled が無効/トークン不一致だと BadRequestException", async () => {
      // findFirst（招待リンク検索）の戻りを null にする
      (prismaMock.project as unknown as { findFirst: jest.Mock }).findFirst = jest
        .fn()
        .mockResolvedValue(null);
      await expect(service.joinByToken(TOKEN, ACTOR_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("既に active なメンバーなら BadRequestException", async () => {
      (prismaMock.project as unknown as { findFirst: jest.Mock }).findFirst = jest
        .fn()
        .mockResolvedValue({ id: PROJECT_ID, inviteToken: TOKEN, inviteLinkEnabled: true });
      prismaMock.projectMember!.findFirst.mockResolvedValueOnce({ id: "pm-existing" });
      await expect(service.joinByToken(TOKEN, ACTOR_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prismaMock.projectMember!.create).not.toHaveBeenCalled();
    });

    it("正常系: projectMember を role=member で作成し、findOne 結果を返す", async () => {
      (prismaMock.project as unknown as { findFirst: jest.Mock }).findFirst = jest
        .fn()
        .mockResolvedValue({ id: PROJECT_ID, inviteToken: TOKEN, inviteLinkEnabled: true });
      prismaMock.projectMember!.findFirst.mockResolvedValueOnce(null);
      prismaMock.projectMember!.create.mockResolvedValue(undefined);

      const result = await service.joinByToken(TOKEN, ACTOR_ID);
      expect(prismaMock.projectMember!.create).toHaveBeenCalledWith({
        data: { projectId: PROJECT_ID, userId: ACTOR_ID, role: "member" },
      });
      // findOne 経由の戻り（id が一致する）
      expect(result.id).toBe(PROJECT_ID);
    });
  });
});
