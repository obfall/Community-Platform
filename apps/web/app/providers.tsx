"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/auth/use-auth";
import { ThemeApplier } from "@/components/theme-applier";
import { handleApiError } from "@/lib/api/error-handler";

export function Providers({ children }: { children: ReactNode }) {
  const t = useTranslations("errors");

  // QueryClient は初回マウント時に 1 度だけ生成。MVP は ja 単独運用なので t を捕捉し続けても問題ない。
  // 将来 locale 切替を入れる場合は QueryClient を再生成する仕組みが必要。
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.meta?.silentError === true) return;
            handleApiError(error, t);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (mutation.meta?.silentError === true) return;
            handleApiError(error, t);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeApplier />
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
