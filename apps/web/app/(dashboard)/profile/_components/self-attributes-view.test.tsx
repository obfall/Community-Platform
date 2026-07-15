import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/settings/use-member-attributes", () => ({
  useMyAttributes: vi.fn(),
}));

import { SelfAttributesView } from "./self-attributes-view";
import { useMyAttributes } from "@/hooks/settings/use-member-attributes";

type UseMyAttributesReturn = ReturnType<typeof useMyAttributes>;

function setMyAttributes(partial: Partial<UseMyAttributesReturn> = {}) {
  vi.mocked(useMyAttributes).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...partial,
  } as never);
}

const selfEditableAttr = {
  attributeId: "a1",
  attributeName: "ニックネーム",
  type: "text" as const,
  value: "たろう",
  isSelfEditable: true,
  options: null,
};

const adminOnlyAttr = {
  attributeId: "a2",
  attributeName: "内部評価",
  type: "text" as const,
  value: "S ランク",
  isSelfEditable: false,
  options: null,
};

describe("SelfAttributesView（プロフィールのカスタム属性表示）", () => {
  describe("ロード状態", () => {
    it("isLoading 中は何も描画されない", () => {
      setMyAttributes({ isLoading: true });
      const { container } = renderWithProviders(<SelfAttributesView />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("管理者専用属性の非表示（多層防御）", () => {
    it("isSelfEditable=false の属性しかないときは何も描画されない", () => {
      setMyAttributes({ isLoading: false, data: [adminOnlyAttr] } as never);
      const { container } = renderWithProviders(<SelfAttributesView />);
      expect(container).toBeEmptyDOMElement();
    });

    it("編集可能属性と管理者専用属性が混在しても、管理者専用属性は表示されない", () => {
      setMyAttributes({
        isLoading: false,
        data: [selfEditableAttr, adminOnlyAttr],
      } as never);
      renderWithProviders(<SelfAttributesView />);

      expect(screen.getByText("ニックネーム")).toBeInTheDocument();
      expect(screen.getByText("たろう")).toBeInTheDocument();
      // 管理者専用属性の名前・値はどちらも漏れないこと
      expect(screen.queryByText("内部評価")).not.toBeInTheDocument();
      expect(screen.queryByText("S ランク")).not.toBeInTheDocument();
    });
  });

  describe("値の表示", () => {
    it("値が未設定のときは『未設定』と表示される", () => {
      setMyAttributes({
        isLoading: false,
        data: [{ ...selfEditableAttr, value: null }],
      } as never);
      renderWithProviders(<SelfAttributesView />);

      expect(screen.getByText("ニックネーム")).toBeInTheDocument();
      expect(screen.getByText("未設定")).toBeInTheDocument();
    });
  });
});
