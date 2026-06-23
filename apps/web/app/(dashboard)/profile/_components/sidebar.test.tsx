import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
}));
vi.mock("@/hooks/auth/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/profile/use-profile", () => ({ useMyProfile: vi.fn() }));
vi.mock("@/hooks/points/use-points", () => ({ usePointSummary: vi.fn() }));

import { ProfileSidebar } from "./sidebar";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMyProfile } from "@/hooks/profile/use-profile";
import { usePointSummary } from "@/hooks/points/use-points";

function setup(role = "admin") {
  vi.mocked(useAuth).mockReturnValue({ user: { name: "管理 太郎", role } } as never);
  vi.mocked(useMyProfile).mockReturnValue({
    data: { profile: { avatarUrl: null }, publicInfo: { nickname: "taro" } },
  } as never);
  vi.mocked(usePointSummary).mockReturnValue({ data: { availablePoints: 500 } } as never);
}

describe("ProfileSidebar", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("ナビゲーション", () => {
    it("profile.json の nav.* ラベルがメニュー項目として表示される", () => {
      setup();
      renderWithProviders(<ProfileSidebar />);
      expect(screen.getByText("プロフィール")).toBeInTheDocument();
      expect(screen.getByText("アクティビティ")).toBeInTheDocument();
      expect(screen.getByText("マイライブラリー")).toBeInTheDocument();
      expect(screen.getByText("個人設定")).toBeInTheDocument();
      expect(screen.getByText("メインメニュー")).toBeInTheDocument();
    });
  });

  describe("ロールバッジ", () => {
    it("user.role が enums.role のラベルで表示される（admin → 管理者）", () => {
      setup("admin");
      renderWithProviders(<ProfileSidebar />);
      expect(screen.getByText("管理者")).toBeInTheDocument();
    });
  });
});
