import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

import { TaskForm, EMPTY_TASK_FORM, type TaskFormState } from "./task-form";
import type { ProjectMember } from "@/lib/api/types";

const MEMBERS: ProjectMember[] = [
  {
    id: "pm-1",
    userId: "u-1",
    name: "佐藤",
    avatarUrl: null,
    occupation: null,
    role: "member",
    joinedAt: "2026-05-01T00:00:00.000Z",
  } as ProjectMember,
  {
    id: "pm-2",
    userId: "u-2",
    name: "鈴木",
    avatarUrl: null,
    occupation: null,
    role: "member",
    joinedAt: "2026-05-01T00:00:00.000Z",
  } as ProjectMember,
];

function setup(initial?: Partial<TaskFormState>) {
  const setForm = vi.fn();
  const setUploading = vi.fn();
  const form: TaskFormState = { ...EMPTY_TASK_FORM, ...initial };
  renderWithProviders(
    <TaskForm
      form={form}
      setForm={setForm}
      members={MEMBERS}
      uploading={false}
      setUploading={setUploading}
    />,
  );
  return { setForm, setUploading, form };
}

describe("TaskForm: タスク作成/編集フォーム", () => {
  it("タイトル・概要の Label と placeholder が表示される", () => {
    setup();
    expect(screen.getByText("タイトル")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("タスク名")).toBeInTheDocument();
    expect(screen.getByText("概要")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("タスクの詳細を入力")).toBeInTheDocument();
  });

  it("メンバー一覧がチェックボックス付きで表示される", () => {
    setup();
    expect(screen.getByText("佐藤")).toBeInTheDocument();
    expect(screen.getByText("鈴木")).toBeInTheDocument();
  });

  it("メンバーが 0 人なら『メンバーがいません』を表示", () => {
    const setForm = vi.fn();
    const setUploading = vi.fn();
    renderWithProviders(
      <TaskForm
        form={EMPTY_TASK_FORM}
        setForm={setForm}
        members={[]}
        uploading={false}
        setUploading={setUploading}
      />,
    );
    expect(screen.getByText("メンバーがいません")).toBeInTheDocument();
  });

  it("タイトル入力で setForm に title patch が渡る", () => {
    const { setForm } = setup();
    fireEvent.change(screen.getByPlaceholderText("タスク名"), {
      target: { value: "新タスク" },
    });
    // setForm は関数を受け取って prev からマージするので、第一呼び出しを実行して結果を検証
    const updater = setForm.mock.calls[0]![0] as (prev: TaskFormState) => TaskFormState;
    expect(updater(EMPTY_TASK_FORM).title).toBe("新タスク");
  });

  it("未選択のメンバーをクリックすると selectedAssignees に追加される", () => {
    const { setForm } = setup({ selectedAssignees: [] });
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]!);

    const updater = setForm.mock.calls[0]![0] as (prev: TaskFormState) => TaskFormState;
    const next = updater({ ...EMPTY_TASK_FORM, selectedAssignees: [] });
    expect(next.selectedAssignees).toEqual(["u-1"]);
  });

  it("選択済みメンバーをクリックすると selectedAssignees から除外される", () => {
    // form に u-1, u-2 が選択済みの状態で u-1 のチェックをクリック → u-2 だけ残る
    const { setForm } = setup({ selectedAssignees: ["u-1", "u-2"] });
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]!);

    const updater = setForm.mock.calls[0]![0] as (prev: TaskFormState) => TaskFormState;
    const next = updater(EMPTY_TASK_FORM);
    expect(next.selectedAssignees).toEqual(["u-2"]);
  });

  it("uploading=true でファイルボタン文言が『アップロード中...』になる", () => {
    const setForm = vi.fn();
    const setUploading = vi.fn();
    renderWithProviders(
      <TaskForm
        form={EMPTY_TASK_FORM}
        setForm={setForm}
        members={MEMBERS}
        uploading
        setUploading={setUploading}
      />,
    );
    expect(screen.getByText("アップロード中...")).toBeInTheDocument();
  });
});
