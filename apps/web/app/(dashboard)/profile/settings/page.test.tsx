import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// next/navigation の最低限の mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/settings",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    changePassword: vi.fn().mockResolvedValue(undefined),
  },
}));

import ProfileSettingsPage from "./page";
import { useAuth } from "@/hooks/auth/use-auth";

function setAuth(user: unknown = { id: "u1", email: "user@test.com" }) {
  vi.mocked(useAuth).mockReturnValue({ user } as never);
}

describe("ProfileSettingsPage（個人設定）", () => {
  describe("アカウント情報表示", () => {
    it("ページタイトルとログインユーザーのメールアドレスが表示される", () => {
      setAuth({ id: "u1", email: "user@test.com" });
      renderWithProviders(<ProfileSettingsPage />);
      expect(screen.getByText("個人設定")).toBeInTheDocument();
      expect(screen.getByText("アカウント情報")).toBeInTheDocument();
      expect(screen.getByText("user@test.com")).toBeInTheDocument();
    });
  });

  describe("パスワード変更フォームの開閉", () => {
    it("初期状態では『パスワードを変更』ボタンのみ表示される", () => {
      setAuth();
      renderWithProviders(<ProfileSettingsPage />);
      expect(screen.getByRole("button", { name: "パスワードを変更" })).toBeInTheDocument();
      expect(screen.queryByText("現在のパスワード")).not.toBeInTheDocument();
    });

    it("ボタンを押すとパスワード変更フォームが展開される", async () => {
      setAuth();
      renderWithProviders(<ProfileSettingsPage />);
      await userEvent.click(screen.getByRole("button", { name: "パスワードを変更" }));
      expect(screen.getByText("現在のパスワード")).toBeInTheDocument();
      expect(screen.getByText("新しいパスワード")).toBeInTheDocument();
      expect(screen.getByText("新しいパスワード（確認）")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "変更する" })).toBeInTheDocument();
      // common.cancel のラベル
      expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    });
  });

  describe("フォームのキャンセル", () => {
    it("キャンセルを押すとフォームが閉じて変更ボタンに戻る", async () => {
      setAuth();
      renderWithProviders(<ProfileSettingsPage />);
      await userEvent.click(screen.getByRole("button", { name: "パスワードを変更" }));
      await userEvent.click(screen.getByRole("button", { name: "キャンセル" }));
      expect(screen.queryByText("現在のパスワード")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "パスワードを変更" })).toBeInTheDocument();
    });
  });
});
