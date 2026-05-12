import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  describe("基本表示", () => {
    it("placeholder と value が反映される", () => {
      render(
        <SearchInput value="abc" onChange={() => {}} onSubmit={() => {}} placeholder="検索..." />,
      );
      const input = screen.getByPlaceholderText("検索...");
      expect(input).toHaveValue("abc");
    });

    it("type=search が付く（ブラウザのクリアボタン表示用）", () => {
      render(<SearchInput value="" onChange={() => {}} onSubmit={() => {}} />);
      const input = screen.getByRole("searchbox");
      expect(input).toBeInTheDocument();
    });
  });

  describe("ユーザー操作", () => {
    it("キー入力で onChange が値ごと呼ばれる", async () => {
      const onChange = vi.fn();
      render(<SearchInput value="" onChange={onChange} onSubmit={() => {}} />);
      const input = screen.getByRole("searchbox");
      await userEvent.type(input, "a");
      expect(onChange).toHaveBeenCalledWith("a");
    });

    it("Enter キー押下で onSubmit が現在値で呼ばれる", async () => {
      const onSubmit = vi.fn();
      render(<SearchInput value="query" onChange={() => {}} onSubmit={onSubmit} />);
      const input = screen.getByRole("searchbox");
      input.focus();
      await userEvent.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledWith("query");
    });

    it("Enter 以外のキーでは onSubmit が呼ばれない", async () => {
      const onSubmit = vi.fn();
      render(<SearchInput value="query" onChange={() => {}} onSubmit={onSubmit} />);
      const input = screen.getByRole("searchbox");
      input.focus();
      await userEvent.keyboard("a");
      await userEvent.keyboard("{Escape}");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("className", () => {
    it("既定では max-w-sm が付く", () => {
      render(<SearchInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByRole("searchbox")).toHaveClass("max-w-sm");
    });

    it("className 指定で上書きされる", () => {
      render(<SearchInput value="" onChange={() => {}} onSubmit={() => {}} className="max-w-xs" />);
      const input = screen.getByRole("searchbox");
      expect(input).toHaveClass("max-w-xs");
      expect(input).not.toHaveClass("max-w-sm");
    });
  });
});
