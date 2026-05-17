import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { toast } from "sonner";

const useApplicationForm = vi.fn();
const upsertConfigMutate = vi.fn();
const createQuestionMutate = vi.fn();
const updateQuestionMutate = vi.fn();
const deleteQuestionMutate = vi.fn();
const reorderQuestionsMutate = vi.fn();

vi.mock("@/hooks/events/use-events", () => ({
  useApplicationForm: () => useApplicationForm(),
  useUpsertApplicationFormConfig: () => ({ mutate: upsertConfigMutate, isPending: false }),
  useCreateQuestion: () => ({ mutate: createQuestionMutate, isPending: false }),
  useUpdateQuestion: () => ({ mutate: updateQuestionMutate, isPending: false }),
  useDeleteQuestion: () => ({ mutate: deleteQuestionMutate, isPending: false }),
  useReorderQuestions: () => ({ mutate: reorderQuestionsMutate, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { ApplicationFormEditor } from "./application-form-editor";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";

function setForm(overrides?: {
  isLoading?: boolean;
  config?: Record<string, unknown> | null;
  questions?: Array<{
    id: string;
    label: string;
    description: string | null;
    questionType: "text" | "textarea" | "radio" | "checkbox" | "select";
    isRequired: boolean;
    sortOrder: number;
    options: Array<{ value: string; label: string }> | null;
  }>;
}) {
  useApplicationForm.mockReturnValue({
    isLoading: overrides?.isLoading ?? false,
    data:
      overrides?.isLoading === true
        ? undefined
        : { config: overrides?.config ?? null, questions: overrides?.questions ?? [] },
  });
}

describe("ApplicationFormEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setForm();
  });

  describe("読み込み状態", () => {
    it("isLoading=true のときは読み込み中表示", () => {
      setForm({ isLoading: true });
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);
      expect(screen.getByText("申込フォーム設定を読み込み中...")).toBeInTheDocument();
    });
  });

  describe("初期表示", () => {
    it("config 未保存時はデフォルト表示（カスタム質問なし、カードタイトル表示）", () => {
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);
      expect(screen.getByText("申込フォーム設定")).toBeInTheDocument();
      expect(screen.getByText("カスタム質問はありません")).toBeInTheDocument();
    });

    it("カスタム質問が存在すれば label と種別が表示される", () => {
      setForm({
        questions: [
          {
            id: "q-1",
            label: "好きな色",
            description: null,
            questionType: "radio",
            isRequired: true,
            sortOrder: 0,
            options: [
              { value: "red", label: "赤" },
              { value: "blue", label: "青" },
            ],
          },
        ],
      });
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);
      expect(screen.getByText("好きな色")).toBeInTheDocument();
      // 種別ラベル + isRequired 表示は 1 要素にまとまっている（"単一選択 ・ 必須"）。
      // 「必須」単独だと基本属性セクションの選択肢ボタンと衝突するのでフル一致で取る。
      expect(screen.getByText("単一選択 ・ 必須")).toBeInTheDocument();
    });
  });

  describe("カスタム質問の追加ダイアログ", () => {
    it("「追加」ボタンでダイアログが開きラベル入力欄が空", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);
      await user.click(screen.getByRole("button", { name: /追加/ }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("質問を追加")).toBeInTheDocument();
      // ラベル入力（質問文）が空
      const labelInput = screen.getByPlaceholderText("質問文") as HTMLInputElement;
      expect(labelInput.value).toBe("");
    });

    it("ラベルが空なら保存ボタンが disabled", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);
      await user.click(screen.getByRole("button", { name: /追加/ }));

      // ダイアログ内の保存ボタン「追加」を取得（外側の「+ 追加」と区別するため within で絞る）
      const dialog = screen.getByRole("dialog");
      const saveButton = within(dialog).getByRole("button", { name: "追加" });
      expect(saveButton).toBeDisabled();
    });

    it("ラベルを入力すれば保存ボタンが押せるようになり、createQuestion.mutate が呼ばれる（text タイプ）", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);
      await user.click(screen.getByRole("button", { name: /追加/ }));

      await user.type(screen.getByPlaceholderText("質問文"), "自由記述");

      const dialog = screen.getByRole("dialog");
      const saveButton = within(dialog).getByRole("button", { name: "追加" });
      expect(saveButton).not.toBeDisabled();

      await user.click(saveButton);

      expect(createQuestionMutate).toHaveBeenCalledTimes(1);
      const callArg = createQuestionMutate.mock.calls[0]![0] as {
        eventId: string;
        data: { label: string; questionType: string; options?: unknown; isRequired: boolean };
      };
      expect(callArg.eventId).toBe(EVENT_ID);
      expect(callArg.data.label).toBe("自由記述");
      expect(callArg.data.questionType).toBe("text");
      // text タイプでは options は付かない
      expect(callArg.data.options).toBeUndefined();
      expect(callArg.data.isRequired).toBe(false);
    });
  });

  describe("既存質問の編集ダイアログ", () => {
    it("編集ボタンで既存値が初期化される（label / questionType / 選択肢）", async () => {
      const user = userEvent.setup();
      setForm({
        questions: [
          {
            id: "q-1",
            label: "好きな色",
            description: "1つだけ選んでください",
            questionType: "radio",
            isRequired: true,
            sortOrder: 0,
            options: [
              { value: "赤", label: "赤" },
              { value: "青", label: "青" },
            ],
          },
        ],
      });
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);
      // 既存質問の編集 (Pencil) ボタンをクリック
      // <p>label</p> の closest("div") → 行内の左カラム div、その親が「行 div」。
      const row = screen.getByText("好きな色").closest("div")!.parentElement!;
      const pencilButton = within(row).getAllByRole("button")[2]!; // up, down, edit, delete の順
      await user.click(pencilButton);

      expect(screen.getByText("質問を編集")).toBeInTheDocument();
      expect((screen.getByPlaceholderText("質問文") as HTMLInputElement).value).toBe("好きな色");
      // 選択肢 input が 2 件、それぞれ既存値（label）で初期化されている
      const optionInputs = screen.getAllByPlaceholderText("選択肢") as HTMLInputElement[];
      expect(optionInputs).toHaveLength(2);
      expect(optionInputs[0]!.value).toBe("赤");
      expect(optionInputs[1]!.value).toBe("青");
    });

    it("旧データで value/label の片方が undefined でも空文字に正規化される", async () => {
      const user = userEvent.setup();
      setForm({
        questions: [
          {
            id: "q-1",
            label: "色",
            description: null,
            questionType: "radio",
            isRequired: false,
            sortOrder: 0,
            options: [
              { value: undefined as unknown as string, label: "赤" },
              { value: "blue", label: undefined as unknown as string },
            ],
          },
        ],
      });
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);
      const row = screen.getByText("色").closest("div")!.parentElement!;
      const pencilButton = within(row).getAllByRole("button")[2]!;
      await user.click(pencilButton);

      const optionInputs = screen.getAllByPlaceholderText("選択肢") as HTMLInputElement[];
      expect(optionInputs[0]!.value).toBe("赤"); // label
      expect(optionInputs[1]!.value).toBe(""); // label が undefined だったので空文字
    });
  });

  describe("選択肢付き質問のバリデーション（radio）", () => {
    function openRadioEdit() {
      setForm({
        questions: [
          {
            id: "q-1",
            label: "色",
            description: null,
            questionType: "radio",
            isRequired: false,
            sortOrder: 0,
            options: [
              { value: "red", label: "赤" },
              { value: "blue", label: "青" },
            ],
          },
        ],
      });
    }

    it("選択肢が空文字のままだとエラートースト、updateQuestion は呼ばれない", async () => {
      const user = userEvent.setup();
      openRadioEdit();
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);

      const row = screen.getByText("色").closest("div")!.parentElement!;
      const pencilButton = within(row).getAllByRole("button")[2]!;
      await user.click(pencilButton);

      const optionInputs = screen.getAllByPlaceholderText("選択肢") as HTMLInputElement[];
      await user.clear(optionInputs[0]!);

      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "更新" }));
      expect(toast.error).toHaveBeenCalledWith("選択肢を入力してください");
      expect(updateQuestionMutate).not.toHaveBeenCalled();
    });

    it("選択肢が重複しているとエラートースト、updateQuestion は呼ばれない", async () => {
      const user = userEvent.setup();
      openRadioEdit();
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);

      const row = screen.getByText("色").closest("div")!.parentElement!;
      const pencilButton = within(row).getAllByRole("button")[2]!;
      await user.click(pencilButton);

      const optionInputs = screen.getAllByPlaceholderText("選択肢") as HTMLInputElement[];
      await user.clear(optionInputs[1]!);
      await user.type(optionInputs[1]!, "赤");

      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "更新" }));
      expect(toast.error).toHaveBeenCalledWith(
        "選択肢が重複しています。一意の選択肢を入力してください",
      );
      expect(updateQuestionMutate).not.toHaveBeenCalled();
    });

    it("正常なら updateQuestion.mutate が value=label 同期された options で呼ばれる", async () => {
      const user = userEvent.setup();
      openRadioEdit();
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);

      const row = screen.getByText("色").closest("div")!.parentElement!;
      const pencilButton = within(row).getAllByRole("button")[2]!;
      await user.click(pencilButton);

      // 2つめを書き換え
      const optionInputs = screen.getAllByPlaceholderText("選択肢") as HTMLInputElement[];
      await user.clear(optionInputs[1]!);
      await user.type(optionInputs[1]!, "黄");

      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "更新" }));
      expect(updateQuestionMutate).toHaveBeenCalledTimes(1);
      const callArg = updateQuestionMutate.mock.calls[0]![0] as {
        data: { options: Array<{ value: string; label: string }> };
      };
      expect(callArg.data.options).toEqual([
        { value: "赤", label: "赤" },
        { value: "黄", label: "黄" },
      ]);
    });

    it("「選択肢を追加」で入力欄が増え、ゴミ箱で減る", async () => {
      const user = userEvent.setup();
      openRadioEdit();
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);

      const row = screen.getByText("色").closest("div")!.parentElement!;
      const pencilButton = within(row).getAllByRole("button")[2]!;
      await user.click(pencilButton);

      expect(screen.getAllByPlaceholderText("選択肢")).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: /選択肢を追加/ }));
      expect(screen.getAllByPlaceholderText("選択肢")).toHaveLength(3);
    });
  });

  describe("並び替え・削除", () => {
    const twoQuestions = [
      {
        id: "q-1",
        label: "Q1",
        description: null,
        questionType: "text" as const,
        isRequired: false,
        sortOrder: 0,
        options: null,
      },
      {
        id: "q-2",
        label: "Q2",
        description: null,
        questionType: "text" as const,
        isRequired: false,
        sortOrder: 1,
        options: null,
      },
    ];

    it("削除ボタンで deleteQuestion.mutate が eventId + questionId で呼ばれる", async () => {
      const user = userEvent.setup();
      setForm({ questions: twoQuestions });
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);

      const row = screen.getByText("Q1").closest("div")!.parentElement!;
      const buttons = within(row).getAllByRole("button"); // up, down, edit, delete
      await user.click(buttons[3]!);

      expect(deleteQuestionMutate).toHaveBeenCalledWith({ eventId: EVENT_ID, questionId: "q-1" });
    });

    it("↓ ボタンで reorderQuestions.mutate が sortOrder を入れ替えた items で呼ばれる", async () => {
      setForm({ questions: twoQuestions });
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);

      const row = screen.getByText("Q1").closest("div")!.parentElement!;
      const buttons = within(row).getAllByRole("button");
      // [up(0), down(1), edit, delete]
      fireEvent.click(buttons[1]!);

      expect(reorderQuestionsMutate).toHaveBeenCalledTimes(1);
      const callArg = reorderQuestionsMutate.mock.calls[0]![0] as {
        eventId: string;
        items: Array<{ id: string; sortOrder: number }>;
      };
      expect(callArg.eventId).toBe(EVENT_ID);
      expect(callArg.items).toEqual([
        { id: "q-1", sortOrder: 1 },
        { id: "q-2", sortOrder: 0 },
      ]);
    });

    it("先頭行の↑、末尾行の↓ は disabled", () => {
      setForm({ questions: twoQuestions });
      renderWithProviders(<ApplicationFormEditor eventId={EVENT_ID} />);

      const row1 = screen.getByText("Q1").closest("div")!.parentElement!;
      const row2 = screen.getByText("Q2").closest("div")!.parentElement!;
      const row1Buttons = within(row1).getAllByRole("button");
      const row2Buttons = within(row2).getAllByRole("button");

      expect(row1Buttons[0]).toBeDisabled(); // 先頭の↑
      expect(row2Buttons[1]).toBeDisabled(); // 末尾の↓
    });
  });
});
