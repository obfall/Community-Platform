import { formatAuthor } from "./author";

describe("formatAuthor: user payload を {id, name, avatarUrl} に変換", () => {
  describe("profile あり", () => {
    it("avatarUrl がセットされていればそのまま返る", () => {
      const result = formatAuthor({
        id: "user-1",
        name: "田中太郎",
        profile: { avatarUrl: "https://example.com/avatar.png" },
      });
      expect(result).toEqual({
        id: "user-1",
        name: "田中太郎",
        avatarUrl: "https://example.com/avatar.png",
      });
    });

    it("avatarUrl が null なら null を返す", () => {
      const result = formatAuthor({
        id: "user-2",
        name: "山田花子",
        profile: { avatarUrl: null },
      });
      expect(result.avatarUrl).toBeNull();
    });
  });

  describe("profile なし", () => {
    it("profile が null なら avatarUrl も null", () => {
      const result = formatAuthor({
        id: "user-3",
        name: "佐藤次郎",
        profile: null,
      });
      expect(result).toEqual({
        id: "user-3",
        name: "佐藤次郎",
        avatarUrl: null,
      });
    });

    it("profile が undefined（プロパティ自体無し）でも avatarUrl は null", () => {
      const result = formatAuthor({
        id: "user-4",
        name: "鈴木一郎",
      });
      expect(result.avatarUrl).toBeNull();
    });
  });

  describe("不要フィールドの除去", () => {
    it("payload に他のフィールドがあっても結果には含まれない", () => {
      const result = formatAuthor({
        id: "user-5",
        name: "高橋三郎",
        profile: { avatarUrl: "https://example.com/x.png" },
        // @ts-expect-error 余分なフィールドを意図的に渡す
        email: "high@example.com",
        role: "admin",
      });
      expect(Object.keys(result)).toEqual(["id", "name", "avatarUrl"]);
      expect(result).not.toHaveProperty("email");
      expect(result).not.toHaveProperty("role");
    });
  });
});
