import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  setUser: vi.fn(),
}));

import { AuthProvider, useAuth } from "./use-auth";
import { authApi } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/auth";

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="ja" messages={{}}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthProvider の外側で呼ぶとエラーになる", () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });

  it("access token がなければ getMe を呼ばず、user は null", async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(authApi.getMe).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("access token があれば getMe を呼んで user を返す", async () => {
    vi.mocked(getAccessToken).mockReturnValue("token-xyz");
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: "u1",
      name: "太郎",
      email: "t@example.com",
      role: "member",
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.user?.id).toBe("u1"));
    expect(result.current.isAuthenticated).toBe(true);
    expect(authApi.getMe).toHaveBeenCalled();
  });

  it("isAdmin: role が owner または admin で true、それ以外で false", async () => {
    vi.mocked(getAccessToken).mockReturnValue("token-xyz");
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: "u1",
      name: "オーナー",
      email: "o@example.com",
      role: "owner",
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.user?.role).toBe("owner"));
    expect(result.current.isAdmin).toBe(true);
  });

  it("canEditAuthor: 本人なら true、admin/owner なら true、それ以外 false", async () => {
    vi.mocked(getAccessToken).mockReturnValue("token-xyz");
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: "u1",
      name: "Taro",
      email: "t@example.com",
      role: "member",
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.user?.id).toBe("u1"));

    expect(result.current.canEditAuthor("u1")).toBe(true); // 本人
    expect(result.current.canEditAuthor("u2")).toBe(false); // 他人
    expect(result.current.canEditAuthor(null)).toBe(false); // authorId が null
    expect(result.current.canEditAuthor(undefined)).toBe(false);
  });
});
