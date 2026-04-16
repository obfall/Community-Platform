"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type BoardScope =
  | { kind: "global" }
  | { kind: "project"; projectId: string }
  | { kind: "event"; eventId: string };

const BoardScopeContext = createContext<BoardScope>({ kind: "global" });

/**
 * BoardScope を提供する Provider。
 * 省略時は global 掲示板として扱う。
 */
export function BoardScopeProvider({
  scope,
  children,
}: {
  scope: BoardScope;
  children: ReactNode;
}) {
  return <BoardScopeContext.Provider value={scope}>{children}</BoardScopeContext.Provider>;
}

export function useBoardScope(): BoardScope {
  return useContext(BoardScopeContext);
}

/**
 * スコープ別のベース URL を返す。
 * API エンドポイントと画面遷移の両方で使用。
 */
export function boardBasePath(scope: BoardScope): string {
  switch (scope.kind) {
    case "global":
      return "/board";
    case "project":
      return `/projects/${scope.projectId}/board`;
    case "event":
      return `/events/${scope.eventId}/board`;
  }
}

/**
 * React Query の queryKey にスコープを表現するためのキー生成。
 * 同じ hook を複数スコープで使っても、キャッシュが混じらない。
 */
export function boardScopeKey(scope: BoardScope): readonly unknown[] {
  switch (scope.kind) {
    case "global":
      return ["global"];
    case "project":
      return ["project", scope.projectId];
    case "event":
      return ["event", scope.eventId];
  }
}

/**
 * 画面遷移用のパスヘルパー。
 */
export function useBoardPaths() {
  const scope = useBoardScope();
  const base = boardBasePath(scope);
  return useMemo(
    () => ({
      index: base,
      topic: (id: string) => `${base}/topics/${id}`,
    }),
    [base],
  );
}
