# 04: API クライアント層の統一

## 目的

API 通信エラーの扱いをフロント全体で統一する:

- **TanStack Query** のグローバル onError でトーストを自動表示
- 各ページで散在している `toast.error()` を削減
- **ネットワーク障害 vs サーバーエラー vs バリデーション** の区別
- **WebSocket** のエラーリカバリ
- axios インターセプタ（既存 401 リトライ）は温存

## 現状調査

- `apps/web/lib/api/client.ts`: axios インターセプタ + 401 リフレッシュトークン自動リトライ + failedQueue（完備）
- `apps/web/app/providers.tsx`: QueryClient 基本設定（`staleTime: 60s` / `retry: 1`）、onError なし
- 各ページ: `toast.error("...")` を個別に呼ぶパターン
- `apps/web/app/(dashboard)/chat/page.tsx`: WebSocket の `chat:error` イベントだけ拾う。リコネクト処理なし

## 目標動作

### サーバーエラー（5xx, unhandled）

→ トースト「サーバーでエラーが発生しました」+ Sentry 送信

### バリデーションエラー（400 + `code: VALIDATION_FAILED`）

→ トースト表示なし。フォーム側で `errors[]` を受け取ってフィールド別表示

### 認証エラー（401）

→ 既存の axios 側で自動リフレッシュ。失敗時はログアウト + リダイレクト

### 権限エラー（403）

→ トースト「権限がありません」、ログインは切らない

### 見つからない（404）

→ エラーの性質による。一覧なら「見つかりませんでした」トースト、詳細ページなら Not Found ページ表示

### ネットワーク障害（接続失敗、タイムアウト）

→ トースト「ネットワーク接続を確認してください」+ 再試行ボタン誘導

## 実装ステップ

### ステップ1: エラーコード共有の検討

01-backend-exception-filter の `ErrorCode` 定数を `packages/shared/src/constants/error-codes.ts` に移し、フロントからも import できるようにする（**確認事項**）。

### ステップ2: 統一エラーハンドラ関数

`apps/web/lib/api/error-handler.ts` を新設:

```ts
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { isAxiosError } from "axios";
import type { ErrorCodeType } from "@community-platform/shared";

export interface ApiErrorShape {
  statusCode: number;
  code: ErrorCodeType | string;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  requestId?: string;
}

export function extractApiError(error: unknown): ApiErrorShape | null {
  if (!isAxiosError(error)) return null;
  if (!error.response) return null;
  return error.response.data ?? null;
}

export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
}

export function handleApiError(error: unknown, options?: { silent?: boolean }) {
  if (options?.silent) return;

  if (isNetworkError(error)) {
    toast.error("ネットワーク接続を確認してください", { id: "network-error" });
    return;
  }

  const apiError = extractApiError(error);
  if (!apiError) {
    toast.error("予期しないエラーが発生しました");
    Sentry.captureException(error);
    return;
  }

  // バリデーションエラーはフォーム側で扱うのでトーストしない
  if (apiError.code === "VALIDATION_FAILED") return;

  // 404 / 403 はドメイン側で扱うことがあるが、デフォルトはトースト
  if (apiError.statusCode === 403) {
    toast.error("この操作を行う権限がありません");
    return;
  }

  // 5xx はサーバーエラー
  if (apiError.statusCode >= 500) {
    toast.error(apiError.message || "サーバーでエラーが発生しました");
    Sentry.captureException(error, {
      contexts: { api: { requestId: apiError.requestId, code: apiError.code } },
    });
    return;
  }

  // その他 4xx
  toast.error(apiError.message || "エラーが発生しました");
}
```

### ステップ3: TanStack Query グローバル onError

`apps/web/app/providers.tsx` を改修:

```tsx
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { handleApiError } from "@/lib/api/error-handler";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.silentError === true) return;
      handleApiError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silentError === true) return;
      handleApiError(error);
    },
  }),
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
    mutations: { retry: 0 },
  },
});
```

個別の hook で toast 不要な場合は `useQuery({ meta: { silentError: true } })` で抑制。

### ステップ4: 既存 `toast.error` の片付け

各 feature の hooks を grep して、以下を整理:

- `useMutation({ onError: (err) => toast.error(err.message) })` → グローバル onError に統合して削除
- フィールドエラーを表示していた箇所 → `extractApiError(error)` を使ってフォーム側に渡す形に
- 必要な箇所だけ個別 onError を残す（例: 「成功トーストは出したい」時）

段階的に移行。新規コードは最初からグローバル onError 前提で書く。

### ステップ5: axios インターセプタとの連携

既存の `client.ts` の 401 リトライロジックは残す。グローバル onError と被らないように:

- `client.ts` の response インターセプタで 401 を検知 → リフレッシュ → 再送
- リフレッシュ失敗時のみ rejection として漏らす → グローバル onError が「認証エラー」として処理
- 401 以外はそのまま reject → グローバル onError に渡す

### ステップ6: WebSocket エラーハンドリング

`apps/web/lib/socket/` 配下にクライアント抽象化があると思われる（要調査・新規作成）。最低限以下を提供:

```ts
socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") {
    socket.connect(); // サーバー側から切断された場合は再接続
  }
  // クライアント側切断は自動再接続されるので何もしない
});
socket.on("connect_error", (err) => {
  toast.error("リアルタイム通信に接続できません", { id: "ws-error" });
  Sentry.captureException(err);
});
```

既存 `chat:error` ハンドラもこれで統一。

### ステップ7: ユーザーコンテキストへ requestId を積む

エラートーストに `requestId` を含めると問い合わせ時のトレーサビリティが上がる（**確認事項**）:

```tsx
toast.error(apiError.message, {
  description: apiError.requestId ? `エラーID: ${apiError.requestId}` : undefined,
});
```

## テスト方針

- Storybook or 動作確認用ページで以下を叩く:
  - ネットワーク障害（バックエンド停止で 3000 叩く）
  - 5xx（API に意図的に 500 を返すエンドポイントを置く）
  - バリデーション失敗（空のフォーム送信）
  - 権限エラー（owner ロールで admin 専用 API を叩く）
- 期待されるトースト / サイレントが観察できること

## 確定事項

- ✅ `ErrorCode` は `packages/shared` に切り出してフロント/バック共有
- ✅ 既存 `toast.error` の移行は **段階移行**（グローバル onError 先行 + 同一トースト ID で重複抑止）

## 残確認事項

- [ ] グローバル onError に統合する方針で OK か（個別 onError は極力削減）
- [ ] トーストに requestId を表示する方針で OK か
- [ ] WebSocket エラーは `chat:error` 以外に想定イベントがあるか要調査

## 成果物

- `apps/web/lib/api/error-handler.ts`
- `apps/web/app/providers.tsx`（QueryClient 改修）
- `apps/web/lib/api/client.ts`（既存、軽微調整）
- `apps/web/lib/socket/` 配下（WebSocket 共通ハンドラ）
- 既存 hooks の `onError` 整理
- `packages/shared/src/constants/error-codes.ts`（共有する場合）
