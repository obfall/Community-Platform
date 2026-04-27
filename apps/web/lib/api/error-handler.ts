import { isAxiosError } from "axios";
import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";
import { ErrorCode } from "@community-platform/shared";

export interface ApiErrorFieldDetail {
  field: string;
  message: string;
  rule?: string;
}

export interface ApiErrorShape {
  statusCode: number;
  code: string;
  message: string;
  errors?: ApiErrorFieldDetail[];
  requestId?: string;
}

/**
 * バックエンドが返す統一エラー形式（all-exceptions.filter.ts と対応）。
 * 形式に該当しない場合は null。
 */
export function extractApiError(error: unknown): ApiErrorShape | null {
  if (!isAxiosError(error)) return null;
  const data = error.response?.data;
  if (!data || typeof data !== "object") return null;
  const candidate = data as Record<string, unknown>;
  if (typeof candidate.statusCode !== "number" || typeof candidate.message !== "string") {
    return null;
  }
  return {
    statusCode: candidate.statusCode,
    code: typeof candidate.code === "string" ? candidate.code : "UNKNOWN",
    message: candidate.message,
    errors: Array.isArray(candidate.errors)
      ? (candidate.errors as ApiErrorFieldDetail[])
      : undefined,
    requestId: typeof candidate.requestId === "string" ? candidate.requestId : undefined,
  };
}

/**
 * axios のレスポンスが返ってこなかった = ネットワーク障害 or サーバー停止。
 */
export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
}

interface HandleOptions {
  /** トースト表示を抑止（フォーム側でフィールドエラー表示する場合などに使用） */
  silent?: boolean;
}

/**
 * API エラーを分類してトースト表示 + Sentry 送信を行う統一ハンドラ。
 * 個別の hook で onError を書く代わりに providers.tsx の QueryCache/MutationCache から呼び出す。
 */
export function handleApiError(error: unknown, options?: HandleOptions): void {
  if (options?.silent) return;

  if (isNetworkError(error)) {
    toast.error("ネットワーク接続を確認してください", { id: "network-error" });
    return;
  }

  const apiError = extractApiError(error);
  if (!apiError) {
    toast.error("予期しないエラーが発生しました", { id: "unknown-error" });
    Sentry.captureException(error);
    return;
  }

  // バリデーションエラーはフォーム側でフィールド単位に表示するためトーストしない
  if (apiError.code === ErrorCode.VALIDATION_FAILED) return;

  // 認証切れは axios インターセプタが自動リフレッシュ → 失敗時はログイン画面へ遷移するためトースト不要
  if (apiError.statusCode === 401) return;

  if (apiError.statusCode === 403) {
    toast.error("この操作を行う権限がありません", {
      id: "forbidden-error",
      description: apiError.requestId ? `エラーID: ${apiError.requestId}` : undefined,
    });
    return;
  }

  if (apiError.statusCode >= 500) {
    toast.error(apiError.message || "サーバーでエラーが発生しました", {
      id: "server-error",
      description: apiError.requestId ? `エラーID: ${apiError.requestId}` : undefined,
    });
    Sentry.captureException(error, {
      contexts: {
        api: {
          requestId: apiError.requestId,
          code: apiError.code,
          statusCode: apiError.statusCode,
        },
      },
    });
    return;
  }

  // その他 4xx（404, 409, 429 等）
  toast.error(apiError.message || "エラーが発生しました", {
    id: `client-error-${apiError.statusCode}`,
    description: apiError.requestId ? `エラーID: ${apiError.requestId}` : undefined,
  });
}
