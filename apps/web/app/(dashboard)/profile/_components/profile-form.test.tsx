import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

// Radix UI Select は jsdom に無い ResizeObserver を参照するため polyfill する
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/auth/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/profile/use-profile", () => ({
  useMyProfile: vi.fn(),
  useUpdateProfile: vi.fn(),
}));

import { ProfileForm } from "./profile-form";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMyProfile, useUpdateProfile } from "@/hooks/profile/use-profile";

function setup(opts: { isLoading?: boolean } = {}) {
  vi.mocked(useAuth).mockReturnValue({ user: { email: "yamada@test.com" } } as never);
  vi.mocked(useUpdateProfile).mockReturnValue({ mutateAsync: vi.fn() } as never);
  vi.mocked(useMyProfile).mockReturnValue({
    isLoading: opts.isLoading ?? false,
    data: opts.isLoading
      ? undefined
      : {
          name: "山田 太郎",
          profile: {
            nameKana: "ヤマダ タロウ",
            phone: "",
            birthday: "",
            gender: "male",
            occupation: "company_employee",
            countryOfOrigin: "",
            avatarUrl: null,
            headerImageUrl: null,
          },
          affiliations: [],
        },
  } as never);
}

describe("ProfileForm", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("ロード状態", () => {
    it("isLoading 中は common.loading（読み込み中...）が表示される", () => {
      setup({ isLoading: true });
      renderWithProviders(<ProfileForm />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("フォーム表示", () => {
    it("主要なラベルが profile.form.* / common.* のキーで表示される", () => {
      setup();
      renderWithProviders(<ProfileForm />);
      expect(screen.getByText("名前（カナ）")).toBeInTheDocument();
      expect(screen.getByText("メールアドレス")).toBeInTheDocument();
      // common.save（保存ボタン）
      expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    });

    it("職業のラジオが enums.occupation のラベルで表示される", () => {
      setup();
      renderWithProviders(<ProfileForm />);
      expect(screen.getByText("会社員")).toBeInTheDocument();
      expect(screen.getByText("自営業")).toBeInTheDocument();
    });
  });
});
