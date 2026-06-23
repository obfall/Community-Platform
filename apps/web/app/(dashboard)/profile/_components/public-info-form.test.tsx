import { describe, it, expect, vi, beforeAll } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// Radix UI の Select は ResizeObserver を参照するが jsdom には未実装のため polyfill する
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// next/navigation の Link / useRouter 用の最低限の mock
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/profile/use-profile", () => ({
  useMyProfile: vi.fn(),
  useUpdatePublicInfo: vi.fn(),
}));

vi.mock("@/hooks/profile/use-interests", () => ({
  useInterestCategories: vi.fn(),
  useReplaceInterests: vi.fn(),
}));

import { PublicInfoForm } from "./public-info-form";
import { useMyProfile, useUpdatePublicInfo } from "@/hooks/profile/use-profile";
import { useInterestCategories, useReplaceInterests } from "@/hooks/profile/use-interests";

function setupMocks(
  opts: {
    isLoading?: boolean;
    profile?: unknown;
    mutateAsync?: ReturnType<typeof vi.fn>;
    replaceAsync?: ReturnType<typeof vi.fn>;
  } = {},
) {
  vi.mocked(useMyProfile).mockReturnValue({
    data: opts.profile,
    isLoading: opts.isLoading ?? false,
  } as never);
  vi.mocked(useInterestCategories).mockReturnValue({ data: [] } as never);
  vi.mocked(useUpdatePublicInfo).mockReturnValue({
    mutateAsync: opts.mutateAsync ?? vi.fn().mockResolvedValue(undefined),
  } as never);
  vi.mocked(useReplaceInterests).mockReturnValue({
    mutateAsync: opts.replaceAsync ?? vi.fn().mockResolvedValue(undefined),
  } as never);
}

const baseProfile = {
  publicInfo: {
    nickname: "",
    nicknameKana: "",
    specialty: "",
    prefecture: "",
    city: "",
    foreignCountry: "",
    foreignCity: "",
    introduction: "",
    eventRole: "",
    publicStatus: "private",
  },
  interests: [],
};

describe("PublicInfoForm（公開情報フォーム）", () => {
  describe("ロード状態", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setupMocks({ isLoading: true });
      renderWithProviders(<PublicInfoForm />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("フォーム表示", () => {
    it("主要なフィールドラベルとカードタイトルが表示される", () => {
      setupMocks({ profile: baseProfile });
      renderWithProviders(<PublicInfoForm />);
      expect(screen.getByText("公開情報")).toBeInTheDocument();
      expect(screen.getByText("ニックネーム")).toBeInTheDocument();
      expect(screen.getByText("専門分野")).toBeInTheDocument();
      // enums.eventRole.lecturer のラベル
      expect(screen.getByText("講師")).toBeInTheDocument();
    });

    it("returnTo 指定時は『戻る』ボタンが表示される", () => {
      setupMocks({ profile: baseProfile });
      renderWithProviders(<PublicInfoForm returnTo="/members/u1" />);
      expect(screen.getByText("戻る")).toBeInTheDocument();
    });
  });

  describe("専門分野（大項目チェックで子を全選択）", () => {
    it("初期表示では中項目は表示されず大項目のみが並ぶ", () => {
      setupMocks({ profile: baseProfile });
      renderWithProviders(<PublicInfoForm />);

      expect(screen.getByRole("checkbox", { name: "IT・テクノロジー" })).toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: "Web開発" })).not.toBeInTheDocument();
    });

    it("大項目をチェックすると配下の中項目が全てチェックされて表示される", async () => {
      setupMocks({ profile: baseProfile });
      renderWithProviders(<PublicInfoForm />);

      await userEvent.click(screen.getByRole("checkbox", { name: "IT・テクノロジー" }));

      const parent = screen.getByRole("checkbox", { name: "IT・テクノロジー" });
      expect(parent).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("checkbox", { name: "Web開発" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(screen.getByRole("checkbox", { name: "モバイル開発" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    it("中項目を一部だけ外すと大項目は indeterminate（aria-checked=mixed）になる", async () => {
      setupMocks({ profile: baseProfile });
      renderWithProviders(<PublicInfoForm />);

      await userEvent.click(screen.getByRole("checkbox", { name: "IT・テクノロジー" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Web開発" }));

      expect(screen.getByRole("checkbox", { name: "IT・テクノロジー" })).toHaveAttribute(
        "aria-checked",
        "mixed",
      );
    });

    it("全選択状態で大項目を再度クリックすると全て解除され中項目が閉じる", async () => {
      setupMocks({ profile: baseProfile });
      renderWithProviders(<PublicInfoForm />);

      await userEvent.click(screen.getByRole("checkbox", { name: "IT・テクノロジー" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "IT・テクノロジー" }));

      expect(screen.getByRole("checkbox", { name: "IT・テクノロジー" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
      expect(screen.queryByRole("checkbox", { name: "Web開発" })).not.toBeInTheDocument();
    });
  });

  describe("送信", () => {
    it("保存ボタンを押すと更新と興味分野更新の mutate が呼ばれる", async () => {
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      const replaceAsync = vi.fn().mockResolvedValue(undefined);
      setupMocks({ profile: baseProfile, mutateAsync, replaceAsync });
      renderWithProviders(<PublicInfoForm />);

      await userEvent.click(screen.getByRole("button", { name: "保存" }));

      expect(mutateAsync).toHaveBeenCalledTimes(1);
      expect(replaceAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe("ニックネーム（カナ）のバリデーション", () => {
    it("全角カタカナ以外を入力するとエラーが表示され送信されない", async () => {
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      setupMocks({ profile: baseProfile, mutateAsync });
      renderWithProviders(<PublicInfoForm />);

      await userEvent.type(screen.getByPlaceholderText("ヒョウジメイ"), "taro");
      await userEvent.click(screen.getByRole("button", { name: "保存" }));

      expect(await screen.findByText("全角カタカナで入力してください")).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it("全角カタカナを入力すると送信される", async () => {
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      setupMocks({ profile: baseProfile, mutateAsync });
      renderWithProviders(<PublicInfoForm />);

      await userEvent.type(screen.getByPlaceholderText("ヒョウジメイ"), "タロウ");
      await userEvent.click(screen.getByRole("button", { name: "保存" }));

      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });
  });
});
