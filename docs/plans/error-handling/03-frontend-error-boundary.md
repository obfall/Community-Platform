# 03: フロントエンド Error Boundary

## 目的

React レンダーツリー内の未捕捉エラーがユーザーに白画面として表示されないよう、階層的な Error Boundary を整備する。

- **root 崩壊時**: `global-error.tsx`（実装済）
- **ページ・レイアウト崩壊時**: `app/error.tsx`（新規）
- **機能別**: `app/(dashboard)/*/error.tsx`（新規）
- **コンポーネント粒度**: 共通 `<ErrorBoundary>`（新規）
- **報告 UI**: Sentry `showReportDialog` または問い合わせリンク

## 現状調査

- `apps/web/app/global-error.tsx`: 実装あり。`Sentry.captureException(error)` + 再試行ボタン
- `apps/web/app/error.tsx`: **未実装**
- `apps/web/app/(dashboard)/*/error.tsx`: 全機能で未配備
- `apps/web/components/`: カスタム `<ErrorBoundary>` コンポーネントなし
- Sentry `showReportDialog` の使用なし

## Next.js App Router での Error Boundary 階層

```
app/
├── global-error.tsx     ← root layout も壊れた時（実装済）
├── error.tsx            ← root layout 内、複数ページ間で共通  ★新規
├── (dashboard)/
│   ├── error.tsx        ← dashboard 配下の共通  ★新規
│   ├── events/
│   │   └── error.tsx    ← events ドメイン固有  ★必要に応じて
│   └── ...
└── (auth)/
    └── error.tsx        ← 認証フロー共通  ★新規
```

各 `error.tsx` は Client Component（`"use client"`）で、`error` と `reset` を受け取る。

## 実装ステップ

### ステップ1: 共通 Error Boundary コンポーネント

`apps/web/components/error-boundary.tsx` を新設（各 error.tsx から呼ぶ）:

```tsx
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  showReportDialog?: boolean;
}

export function ErrorFallback({
  error,
  reset,
  title = "エラーが発生しました",
  description = "ページの読み込み中に問題が発生しました。再試行してください。",
  showReportDialog = false,
}: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      {error.digest && <p className="text-xs text-muted-foreground">エラーID: {error.digest}</p>}
      <div className="flex gap-3">
        <Button onClick={reset}>再試行</Button>
        {showReportDialog && (
          <Button
            variant="outline"
            onClick={() => Sentry.showReportDialog({ eventId: error.digest })}
          >
            問題を報告
          </Button>
        )}
      </div>
    </div>
  );
}
```

### ステップ2: `app/error.tsx`（root layout 内）

```tsx
"use client";
import { ErrorFallback } from "@/components/error-boundary";
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback {...props} />;
}
```

### ステップ3: `app/(dashboard)/error.tsx`（dashboard 共通）

```tsx
"use client";
import { ErrorFallback } from "@/components/error-boundary";
export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      {...props}
      title="画面表示中にエラーが発生しました"
      description="一時的な問題の可能性があります。再試行して解決しない場合はサポートまでご連絡ください。"
      showReportDialog
    />
  );
}
```

### ステップ4: ドメイン別 `error.tsx`（選抜）

特に重要な機能にはドメイン固有のメッセージ付き error.tsx を配備:

- `app/(dashboard)/events/error.tsx` — 「イベント情報の読み込みに失敗しました」
- `app/(dashboard)/board/error.tsx` — 「掲示板の読み込みに失敗しました」
- `app/(dashboard)/videos/error.tsx` — 「動画の再生でエラーが発生しました」
- `app/(dashboard)/shop/error.tsx` — 「ショップ情報の読み込みに失敗しました」

他のドメインは dashboard 共通で吸収。

### ステップ5: `app/global-error.tsx` の改良

既存は再試行ボタンのみ。`ErrorFallback` を使う形に揃えたいが、**global-error は独自 `<html><body>` を持つ必要がある**ため単純に共通化できない。以下のように並行して持つ:

```tsx
"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="ja">
      <body>
        <div style={{ padding: 32, textAlign: "center" }}>
          <h1>システムエラー</h1>
          <p>予期しないエラーが発生しました。</p>
          <button onClick={reset}>再読み込み</button>
        </div>
      </body>
    </html>
  );
}
```

### ステップ6: 報告 UI 方針

Sentry の `showReportDialog` を使う際の注意:

- 本番では Sentry 設定で `showBranding: false` 等を設定（体裁調整）
- ユーザーが報告フォームから送る追加情報（コメント）が Sentry イベントに紐付く
- **代替**: Sentry ではなく社内フォーム（Slack or メール）へ誘導する場合は Button の onClick を変える

ドメインによって使い分けるのも可（dashboard 共通: Sentry、global-error: 問い合わせ先表示のみ）。

## テスト方針

- 各 error.tsx は「エラーを投げるテスト用のページ」を作成して挙動確認
- 例: `app/debug/error-trigger/page.tsx` で `throw new Error("test")` → dashboard error.tsx が表示される
- 本番では E2E テスト（Phase 11.5）でエラー経路を検証

## 確定事項

- ✅ ドメイン別 error.tsx の配備範囲は **events / board / videos / shop の 4 ドメイン**、他は dashboard 共通でフォールバック

## 残確認事項

- [ ] ErrorFallback を `apps/web/components/` に置く方針で OK か（共有コンポーネントのため）
- [ ] エラー報告 UI に Sentry `showReportDialog` を使う方針で OK か
- [ ] global-error.tsx はスタイル最小限（html/body のみ）で OK か

## 成果物

- `apps/web/components/error-boundary.tsx`
- `apps/web/app/error.tsx`
- `apps/web/app/(dashboard)/error.tsx`
- `apps/web/app/(dashboard)/events/error.tsx`
- `apps/web/app/(dashboard)/board/error.tsx`
- `apps/web/app/(dashboard)/videos/error.tsx`
- `apps/web/app/(dashboard)/shop/error.tsx`
- `apps/web/app/global-error.tsx`（既存改良）
