import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaginationBar } from "./pagination-bar";
import { renderWithProviders } from "@/test/test-utils";
import type { PaginationMeta } from "@/lib/api/types";

function meta(overrides: Partial<PaginationMeta> = {}): PaginationMeta {
  return {
    total: 50,
    page: 2,
    limit: 20,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
    ...overrides,
  };
}

describe("PaginationBar", () => {
  describe("描画条件", () => {
    it("total=0 のときは何も描画しない", () => {
      const { container } = renderWithProviders(
        <PaginationBar meta={meta({ total: 0, totalPages: 0 })} onPageChange={() => {}} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("total>0 のときはサマリーとボタンが描画される", () => {
      renderWithProviders(<PaginationBar meta={meta()} onPageChange={() => {}} />);
      expect(screen.getByRole("button", { name: /前へ/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /次へ/ })).toBeInTheDocument();
      expect(screen.getByText(/全 50 件中/)).toBeInTheDocument();
    });
  });

  describe("件数サマリーの表示", () => {
    it("page=2 limit=20 total=50 で 21〜40 件と表示される", () => {
      renderWithProviders(<PaginationBar meta={meta()} onPageChange={() => {}} />);
      expect(screen.getByText("全 50 件中 21〜40 件を表示")).toBeInTheDocument();
    });

    it("最終ページで limit より少ない件数の場合、to は total と一致", () => {
      renderWithProviders(
        <PaginationBar
          meta={meta({ page: 3, limit: 20, total: 50, totalPages: 3, hasNextPage: false })}
          onPageChange={() => {}}
        />,
      );
      // page=3 → from = 41, to = min(60, 50) = 50
      expect(screen.getByText("全 50 件中 41〜50 件を表示")).toBeInTheDocument();
    });
  });

  describe("ボタン操作", () => {
    it("前へを押すと onPageChange(page-1) が呼ばれる", async () => {
      const onPageChange = vi.fn();
      renderWithProviders(<PaginationBar meta={meta()} onPageChange={onPageChange} />);
      await userEvent.click(screen.getByRole("button", { name: /前へ/ }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("次へを押すと onPageChange(page+1) が呼ばれる", async () => {
      const onPageChange = vi.fn();
      renderWithProviders(<PaginationBar meta={meta()} onPageChange={onPageChange} />);
      await userEvent.click(screen.getByRole("button", { name: /次へ/ }));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("hasPreviousPage=false なら前へが disabled", () => {
      renderWithProviders(
        <PaginationBar meta={meta({ page: 1, hasPreviousPage: false })} onPageChange={() => {}} />,
      );
      expect(screen.getByRole("button", { name: /前へ/ })).toBeDisabled();
    });

    it("hasNextPage=false なら次へが disabled", () => {
      renderWithProviders(
        <PaginationBar meta={meta({ page: 3, hasNextPage: false })} onPageChange={() => {}} />,
      );
      expect(screen.getByRole("button", { name: /次へ/ })).toBeDisabled();
    });
  });

  describe("ページ番号表示", () => {
    it("page / totalPages 形式で表示される", () => {
      renderWithProviders(<PaginationBar meta={meta()} onPageChange={() => {}} />);
      expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });

    it("totalPages=0 でも 1 として表示される（divide-by-zero 防止）", () => {
      renderWithProviders(
        <PaginationBar
          meta={meta({ total: 5, totalPages: 0, page: 1, hasNextPage: false })}
          onPageChange={() => {}}
        />,
      );
      // Math.max(meta.totalPages, 1) で 1 にクランプ
      expect(screen.getByText("1 / 1")).toBeInTheDocument();
    });
  });
});
