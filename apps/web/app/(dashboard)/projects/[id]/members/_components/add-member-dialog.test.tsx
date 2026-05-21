import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

const addMemberMutate = vi.fn();

vi.mock("@/hooks/members/use-members", () => ({
  useMembers: vi.fn(),
}));
vi.mock("@/hooks/projects/use-projects", () => ({
  useAddProjectMember: vi.fn(() => ({ mutate: addMemberMutate, isPending: false })),
}));

import { AddMemberDialog } from "./add-member-dialog";
import { useMembers } from "@/hooks/members/use-members";

const MEMBERS = [
  { id: "u-1", name: "佐藤", email: "sato@example.com", avatarUrl: null },
  { id: "u-2", name: "鈴木", email: "suzuki@example.com", avatarUrl: null },
];

describe("AddMemberDialog: メンバー追加ダイアログ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMembers).mockReturnValue({
      data: { data: MEMBERS, meta: {} },
      isLoading: false,
    } as never);
  });

  it("open=true でタイトル・説明が表示される", () => {
    renderWithProviders(
      <AddMemberDialog projectId="p-1" existingUserIds={[]} open onOpenChange={() => {}} />,
    );
    expect(screen.getByText("メンバーを追加")).toBeInTheDocument();
    expect(
      screen.getByText("プロジェクトに参加させるユーザーを選択してください"),
    ).toBeInTheDocument();
  });

  it("既存メンバーは候補から除外される", () => {
    renderWithProviders(
      <AddMemberDialog projectId="p-1" existingUserIds={["u-1"]} open onOpenChange={() => {}} />,
    );
    expect(screen.queryByText("佐藤")).not.toBeInTheDocument();
    expect(screen.getByText("鈴木")).toBeInTheDocument();
  });

  it("候補ゼロ + 検索なしなら『追加できるユーザーがいません』表示", () => {
    vi.mocked(useMembers).mockReturnValue({
      data: { data: [], meta: {} },
      isLoading: false,
    } as never);
    renderWithProviders(
      <AddMemberDialog projectId="p-1" existingUserIds={[]} open onOpenChange={() => {}} />,
    );
    expect(screen.getByText("追加できるユーザーがいません")).toBeInTheDocument();
  });

  it("追加ボタン押下で addMember.mutate が role 付きで呼ばれる", () => {
    renderWithProviders(
      <AddMemberDialog projectId="p-1" existingUserIds={[]} open onOpenChange={() => {}} />,
    );
    const addButtons = screen.getAllByRole("button", { name: /追加$/ });
    fireEvent.click(addButtons[0]!);
    expect(addMemberMutate).toHaveBeenCalledWith(
      { userId: "u-1", role: "member" },
      expect.any(Object),
    );
  });
});
