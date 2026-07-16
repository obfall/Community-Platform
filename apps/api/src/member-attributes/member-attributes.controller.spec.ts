import type { StreamableFile } from "@nestjs/common";
import { UserAttributesController } from "./member-attributes.controller";

const BOM = "\uFEFF";

/** StreamableFile の中身（CSV 文字列）を読み出すヘルパー。 */
async function readCsv(file: StreamableFile): Promise<string> {
  const stream = file.getStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/** 先頭の UTF-8 BOM を取り除く。 */
function stripBom(csv: string): string {
  return csv.startsWith(BOM) ? csv.slice(BOM.length) : csv;
}

describe("UserAttributesController", () => {
  describe("exportCsv: メンバー CSV エクスポート", () => {
    let usersServiceMock: { findAllForExport: jest.Mock };
    let controller: UserAttributesController;
    let res: { set: jest.Mock };

    beforeEach(() => {
      usersServiceMock = { findAllForExport: jest.fn().mockResolvedValue([]) };
      // 第 1 引数（MemberAttributesService）は exportCsv では未使用のためダミー。
      controller = new UserAttributesController({} as never, usersServiceMock as never);
      res = { set: jest.fn() };
    });

    it("画面の絞り込み条件（query）を findAllForExport にそのまま渡す", async () => {
      const query = { search: "田中", role: "member", status: "suspended" };
      await controller.exportCsv(query as never, res as never);
      expect(usersServiceMock.findAllForExport).toHaveBeenCalledWith(query);
    });

    it("ヘッダーは 5 列固定（ランク・カスタム属性列を含まない）", async () => {
      const file = await controller.exportCsv({} as never, res as never);
      const header = stripBom(await readCsv(file)).split("\n")[0];
      expect(header).toBe("名前,メール,ロール,ステータス,登録日");
      expect(header).not.toContain("ランク");
    });

    it("先頭に UTF-8 BOM を付与する", async () => {
      const file = await controller.exportCsv({} as never, res as never);
      const csv = await readCsv(file);
      expect(csv.startsWith(BOM)).toBe(true);
    });

    it("データ行は 名前/メール/ロール/ステータス/登録日 の順で出力する", async () => {
      usersServiceMock.findAllForExport.mockResolvedValueOnce([
        {
          name: "田中",
          email: "tanaka@example.com",
          role: "member",
          status: "active",
          createdAt: new Date("2026-01-15T00:00:00.000Z"),
        },
      ]);
      const file = await controller.exportCsv({} as never, res as never);
      const dataRow = stripBom(await readCsv(file)).split("\n")[1];
      expect(dataRow).toBe("田中,tanaka@example.com,member,active,2026-01-15");
    });

    it("カンマを含む値はダブルクォートでエスケープする", async () => {
      usersServiceMock.findAllForExport.mockResolvedValueOnce([
        {
          name: "田中, 太郎",
          email: "t@example.com",
          role: "member",
          status: "active",
          createdAt: new Date("2026-01-15T00:00:00.000Z"),
        },
      ]);
      const file = await controller.exportCsv({} as never, res as never);
      const dataRow = stripBom(await readCsv(file)).split("\n")[1];
      expect(dataRow).toContain('"田中, 太郎"');
    });

    it("Content-Type と members_YYYYMMDD.csv のファイル名を設定する", async () => {
      await controller.exportCsv({} as never, res as never);
      const setArg = res.set.mock.calls[0]?.[0];
      expect(setArg["Content-Type"]).toContain("text/csv");
      expect(setArg["Content-Disposition"]).toMatch(/attachment; filename=members_\d{8}\.csv/);
    });
  });
});
