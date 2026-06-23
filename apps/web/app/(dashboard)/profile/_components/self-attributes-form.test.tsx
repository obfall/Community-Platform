import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/settings/use-member-attributes", () => ({
  useMyAttributes: vi.fn(),
  useSetMyAttributes: vi.fn(),
}));

import { SelfAttributesForm } from "./self-attributes-form";
import { useMyAttributes, useSetMyAttributes } from "@/hooks/settings/use-member-attributes";

type UseMyAttributesReturn = ReturnType<typeof useMyAttributes>;
type UseSetMyAttributesReturn = ReturnType<typeof useSetMyAttributes>;

function setMyAttributes(partial: Partial<UseMyAttributesReturn> = {}) {
  vi.mocked(useMyAttributes).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...partial,
  } as never);
}

function setMutation(partial: Partial<UseSetMyAttributesReturn> = {}) {
  const mutate = vi.fn();
  vi.mocked(useSetMyAttributes).mockReturnValue({
    mutate,
    isPending: false,
    ...partial,
  } as never);
  return mutate;
}

const textAttr = {
  attributeId: "a1",
  attributeName: "ニックネーム",
  type: "text" as const,
  value: "たろう",
  isSelfEditable: true,
  options: null,
};

describe("SelfAttributesForm（自己編集可能なカスタム属性フォーム）", () => {
  describe("ロード状態", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setMyAttributes({ isLoading: true });
      setMutation();
      renderWithProviders(<SelfAttributesForm />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("自己編集可能な属性の有無", () => {
    it("isSelfEditable な属性が無いときは何も描画されない", () => {
      setMyAttributes({
        isLoading: false,
        data: [{ ...textAttr, isSelfEditable: false }],
      } as never);
      setMutation();
      const { container } = renderWithProviders(<SelfAttributesForm />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("フォーム表示", () => {
    it("編集可能な属性名と保存・キャンセルボタンが表示される", () => {
      setMyAttributes({ isLoading: false, data: [textAttr] } as never);
      setMutation();
      renderWithProviders(<SelfAttributesForm />);
      expect(screen.getByText("ニックネーム")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    });
  });

  describe("保存", () => {
    it("保存ボタン押下で setMutation.mutate が属性値とともに呼ばれる", async () => {
      setMyAttributes({ isLoading: false, data: [textAttr] } as never);
      const mutate = setMutation();
      renderWithProviders(<SelfAttributesForm />);

      await userEvent.click(screen.getByRole("button", { name: "保存" }));

      expect(mutate).toHaveBeenCalledTimes(1);
      const items = mutate.mock.calls[0]?.[0];
      expect(items).toEqual([{ attributeId: "a1", value: "たろう" }]);
    });
  });
});
