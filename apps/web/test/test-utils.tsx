import { Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import commonMessages from "@/messages/ja/common.json";
import enumsMessages from "@/messages/ja/enums.json";
import membersMessages from "@/messages/ja/members.json";
import boardMessages from "@/messages/ja/board.json";
import chatMessages from "@/messages/ja/chat.json";
import dashboardMessages from "@/messages/ja/dashboard.json";
import eventsMessages from "@/messages/ja/events.json";

const messages = {
  common: commonMessages,
  enums: enumsMessages,
  members: membersMessages,
  board: boardMessages,
  chat: chatMessages,
  dashboard: dashboardMessages,
  events: eventsMessages,
};

/**
 * 単体テスト用に必要な Provider をまとめて被せるラッパー。
 * - next-intl: useTranslations を呼ぶコンポーネント用
 * - QueryClient: useQuery/useMutation 系の hook 用
 */
export function TestProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  // Suspense は `use(params)` の suspension を捕捉するために必要。
  // Next.js は本番では App Router レイヤで Suspense を提供するが、テストでは自前で用意する。
  return (
    <NextIntlClientProvider locale="ja" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>{children}</Suspense>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}

/**
 * render() を Provider 付きで実行する helper。
 * 大半の component / page テストはこれで済む。
 */
export function renderWithProviders(
  ui: ReactNode,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return render(ui, { wrapper: TestProviders, ...options });
}

/**
 * React Query hook のテスト用の wrapper を生成する。
 * renderHook の第 2 引数に渡す。
 */
export function createHookWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="ja" messages={messages}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return { wrapper: Wrapper, queryClient };
}
