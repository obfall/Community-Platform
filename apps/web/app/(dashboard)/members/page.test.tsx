import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// next/navigation の Link 用に最低限の mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/members",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/members/use-members", () => ({
  useMembers: vi.fn(),
}));

import MembersPage from "./page";
import { useMembers } from "@/hooks/members/use-members";

type UseMembersReturn = ReturnType<typeof useMembers>;

function setMembersResult(partial: Partial<UseMembersReturn> = {}) {
  vi.mocked(useMembers).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: false,
    ...partial,
  } as never);
}

const baseMeta = {
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe("MembersPage（一覧）", () => {
  describe("ロード状態", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setMembersResult({ isLoading: true });
      renderWithProviders(<MembersPage />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("空状態", () => {
    it("メンバー 0 件のとき『メンバーが見つかりません』が表示される", () => {
      setMembersResult({
        isLoading: false,
        data: { data: [], meta: { ...baseMeta, total: 0 } },
      } as never);
      renderWithProviders(<MembersPage />);
      expect(screen.getByText("メンバーが見つかりません")).toBeInTheDocument();
    });
  });

  describe("一覧表示", () => {
    it("メンバーの name とロールラベルが行に表示される", () => {
      setMembersResult({
        isLoading: false,
        data: {
          data: [
            {
              id: "u1",
              name: "山田 太郎",
              email: "yamada@test.com",
              role: "member",
              status: "active",
              avatarUrl: null,
              createdAt: "2026-01-01T00:00:00Z",
            },
          ],
          meta: baseMeta,
        },
      } as never);
      renderWithProviders(<MembersPage />);
      expect(screen.getByText("山田 太郎")).toBeInTheDocument();
      // enums.role.member は「メンバー」
      expect(screen.getByText("メンバー", { selector: ".text-xs" })).toBeInTheDocument();
    });

    it("useMembers に excludeAdmin:true が渡される（admin はサーバ側で除外）", () => {
      setMembersResult({
        isLoading: false,
        data: { data: [], meta: { ...baseMeta, total: 0 } },
      } as never);
      renderWithProviders(<MembersPage />);
      const firstCall = vi.mocked(useMembers).mock.calls[0]?.[0];
      expect(firstCall?.excludeAdmin).toBe(true);
    });
  });

  describe("検索", () => {
    it("入力して Enter すると useMembers が更新済み query で再呼び出しされる", async () => {
      setMembersResult({
        isLoading: false,
        data: { data: [], meta: { ...baseMeta, total: 0 } },
      } as never);
      renderWithProviders(<MembersPage />);

      const input = screen.getByPlaceholderText("名前で検索...");
      await userEvent.type(input, "田中");
      await userEvent.keyboard("{Enter}");

      // 最後の呼び出しに search="田中" が含まれている
      const calls = vi.mocked(useMembers).mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last?.search).toBe("田中");
    });
  });
});
