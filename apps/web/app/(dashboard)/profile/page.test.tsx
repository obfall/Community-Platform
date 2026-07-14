import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/auth/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/profile/use-profile", () => ({ useMyProfile: vi.fn() }));
vi.mock("@/hooks/points/use-points", () => ({ usePointSummary: vi.fn() }));
// page.tsx は SelfAttributesView を描画するため、その依存もモックする
vi.mock("@/hooks/settings/use-member-attributes", () => ({ useMyAttributes: vi.fn() }));

import MyPage from "./page";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMyProfile } from "@/hooks/profile/use-profile";
import { usePointSummary } from "@/hooks/points/use-points";
import { useMyAttributes } from "@/hooks/settings/use-member-attributes";

function setup(
  profileData: unknown,
  user: unknown = { name: "山田 太郎", email: "yamada@test.com", role: "member" },
) {
  vi.mocked(useAuth).mockReturnValue({ user } as never);
  vi.mocked(useMyProfile).mockReturnValue({ data: profileData } as never);
  vi.mocked(usePointSummary).mockReturnValue({ data: { availablePoints: 1200 } } as never);
  vi.mocked(useMyAttributes).mockReturnValue({ data: [], isLoading: false } as never);
}

const baseProfile = {
  name: "山田 太郎",
  createdAt: "2026-01-01T00:00:00Z",
  profile: {
    nameKana: "ヤマダ タロウ",
    occupation: "company_employee",
    phone: "",
    birthday: null,
    gender: "male",
    countryOfOrigin: "",
    avatarUrl: null,
    headerImageUrl: null,
  },
  publicInfo: { nickname: "taro", publicStatus: "public" },
  affiliations: [],
  interests: [],
};

describe("MyPage（プロフィール）", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("見出し", () => {
    it("プロフィール情報・公開情報のセクション見出しが表示される", () => {
      setup(baseProfile);
      renderWithProviders(<MyPage />);
      expect(screen.getByText("プロフィール情報")).toBeInTheDocument();
      expect(screen.getByText("公開情報")).toBeInTheDocument();
    });
  });

  describe("enum ラベル解決", () => {
    it("ロール・職業・性別が enums のラベルで表示される", () => {
      setup(baseProfile);
      renderWithProviders(<MyPage />);
      // enums.role.member / enums.occupation.company_employee / enums.gender.male
      expect(screen.getByText("メンバー")).toBeInTheDocument();
      expect(screen.getByText("会社員")).toBeInTheDocument();
      expect(screen.getByText("男性")).toBeInTheDocument();
    });
  });

  describe("未設定の表示", () => {
    it("未入力の項目は common.notSet（未設定）が表示される", () => {
      setup({
        ...baseProfile,
        profile: { ...baseProfile.profile, phone: "", countryOfOrigin: "" },
      });
      renderWithProviders(<MyPage />);
      // 電話番号・出身国が未設定
      expect(screen.getAllByText("未設定").length).toBeGreaterThan(0);
    });
  });

  describe("公開ステータス", () => {
    it("publicStatus が public のとき『公開』バッジが表示される", () => {
      setup(baseProfile);
      renderWithProviders(<MyPage />);
      expect(screen.getByText("公開")).toBeInTheDocument();
    });
  });
});
