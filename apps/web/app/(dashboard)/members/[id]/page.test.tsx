import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/members/use-members", () => ({
  useMember: vi.fn(),
  useMemberEvents: vi.fn(),
  useMemberProjects: vi.fn(),
  useStartDm: vi.fn(),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

import MemberDetailPage from "./page";
import {
  useMember,
  useMemberEvents,
  useMemberProjects,
  useStartDm,
} from "@/hooks/members/use-members";
import { useAuth } from "@/hooks/auth/use-auth";

function setHooks(opts: {
  member?: object | undefined | null;
  isLoading?: boolean;
  authUser?: { id: string; role: string } | null;
}) {
  vi.mocked(useMember).mockReturnValue({
    data: opts.member,
    isLoading: opts.isLoading ?? false,
  } as never);
  vi.mocked(useMemberEvents).mockReturnValue({ data: [] } as never);
  vi.mocked(useMemberProjects).mockReturnValue({ data: [] } as never);
  vi.mocked(useStartDm).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(useAuth).mockReturnValue({ user: opts.authUser ?? null } as never);
}

const baseMember = {
  id: "u-target",
  name: "山田 太郎",
  email: "yamada@test.com",
  role: "member",
  status: "active",
  avatarUrl: null,
  createdAt: "2026-01-15T00:00:00Z",
  profile: {
    avatarUrl: null,
    phone: null,
    birthday: null,
    nameKana: null,
    gender: null,
    occupation: "エンジニア",
    countryOfOrigin: "日本",
    headerImageUrl: null,
  },
  publicInfo: null,
  interests: [],
  languages: [],
  affiliations: [],
};

/**
 * React 19 の use() に渡すための「即時解決済み Promise」を作る。
 * status / value を持つ thenable は use() が同期的に値を取り出す。
 */
function syncParams<T extends object>(value: T): Promise<T> {
  const p = Promise.resolve(value) as unknown as Promise<T> & { status: string; value: T };
  p.status = "fulfilled";
  p.value = value;
  return p;
}

describe("MemberDetailPage（詳細）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ロード／未検出", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setHooks({ isLoading: true });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u1" })} />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("メンバー未検出時は『メンバーが見つかりません』が表示される", () => {
      setHooks({ member: null });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u1" })} />);
      expect(screen.getByText("メンバーが見つかりません")).toBeInTheDocument();
    });
  });

  describe("プロフィール情報 Card の出し分け", () => {
    it("一般メンバーが見る時、Card は表示される（email 行は無い）", () => {
      setHooks({ member: baseMember, authUser: { id: "viewer", role: "member" } });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u-target" })} />);
      expect(screen.getByText("プロフィール情報")).toBeInTheDocument();
      expect(screen.queryByText("yamada@test.com")).not.toBeInTheDocument();
      expect(screen.getByText("エンジニア")).toBeInTheDocument();
    });

    it("admin が見る時、email 行が表示される", () => {
      setHooks({ member: baseMember, authUser: { id: "admin", role: "admin" } });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u-target" })} />);
      expect(screen.getByText("yamada@test.com")).toBeInTheDocument();
    });

    it("owner が見ても email は出ない（admin only）", () => {
      setHooks({ member: baseMember, authUser: { id: "owner", role: "owner" } });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u-target" })} />);
      expect(screen.queryByText("yamada@test.com")).not.toBeInTheDocument();
    });
  });

  describe("公開情報 Card の出し分け", () => {
    it("publicStatus=public のとき Card が表示される", () => {
      const member = {
        ...baseMember,
        publicInfo: {
          nickname: "やまけん",
          nicknameKana: null,
          specialty: null,
          prefecture: "東京都",
          city: null,
          introduction: "よろしく",
          eventRole: null,
          publicStatus: "public" as const,
        },
      };
      setHooks({ member, authUser: { id: "viewer", role: "member" } });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u-target" })} />);
      expect(screen.getByText("公開情報")).toBeInTheDocument();
      expect(screen.getByText("やまけん")).toBeInTheDocument();
      expect(screen.getByText("東京都")).toBeInTheDocument();
      expect(screen.getByText("よろしく")).toBeInTheDocument();
    });

    it("publicStatus=private なら Card 自体が表示されない", () => {
      const member = {
        ...baseMember,
        publicInfo: {
          nickname: "やまけん",
          nicknameKana: null,
          specialty: null,
          prefecture: null,
          city: null,
          introduction: "秘密",
          eventRole: null,
          publicStatus: "private" as const,
        },
      };
      setHooks({ member, authUser: { id: "viewer", role: "member" } });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u-target" })} />);
      expect(screen.queryByText("公開情報")).not.toBeInTheDocument();
      expect(screen.queryByText("秘密")).not.toBeInTheDocument();
    });

    it("publicInfo が null なら Card が表示されない", () => {
      setHooks({ member: baseMember, authUser: { id: "viewer", role: "member" } });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u-target" })} />);
      expect(screen.queryByText("公開情報")).not.toBeInTheDocument();
    });
  });

  describe("チャットボタンの出し分け", () => {
    it("自分以外を見る時はチャットボタンが表示される", () => {
      setHooks({ member: baseMember, authUser: { id: "viewer", role: "member" } });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u-target" })} />);
      expect(screen.getByRole("button", { name: /チャット/ })).toBeInTheDocument();
    });

    it("自分のページを見る時はチャットボタンが表示されない", () => {
      setHooks({ member: baseMember, authUser: { id: "u-target", role: "member" } });
      renderWithProviders(<MemberDetailPage params={syncParams({ id: "u-target" })} />);
      expect(screen.queryByRole("button", { name: /チャット/ })).not.toBeInTheDocument();
    });
  });
});
