# 02: XSS 対策（リッチテキストサニタイズ）

## 目的

ユーザー入力 HTML を扱う経路に対し、**入力時（バックエンド保存前）と出力時（フロント描画前）の二重サニタイズ** を実装し、XSS 攻撃を防ぐ。

## 現状調査

### 危険な箇所

- `apps/web/components/broadcasts/broadcast-detail.tsx`: `dangerouslySetInnerHTML={{ __html: broadcast.bodyHtml }}` をサニタイズなしで使用
- `apps/api/src/broadcasts/dispatchers/in-app.dispatcher.ts`: 正規表現で簡易 HTML 削除のみ（`stripHtml()`）

### 入力経路

- `Broadcast.bodyHtml`（運営が HTML を直接入力するメール本文）
- 他のテキストフィールド（`BoardTopic.body`、`BoardTopicPost.body`、`Memo.body` 等）はプレーンテキスト想定だが、念のため確認必要

### 既存の防御

- React は通常の `{value}` 補間で自動エスケープするので、`dangerouslySetInnerHTML` 以外は安全
- バックエンド `class-validator` で文字列 length / format 検証はあるが、HTML サニタイズは未実装

## 二重サニタイズの考え方

| 層                 | ライブラリ      | 役割                                                                        |
| ------------------ | --------------- | --------------------------------------------------------------------------- |
| バックエンド入力時 | `sanitize-html` | DB に保存する前に危険なタグ・属性を除去（永続的な防御）                     |
| フロント出力時     | `DOMPurify`     | DB から取り出した HTML をブラウザに描画する直前に再度サニタイズ（多重防御） |

両方やる理由: 過去のデータ（既に保存済みの未サニタイズ HTML）への防御 + 将来 DB を直接編集された場合への防御。

## 実装ステップ

### ステップ1: バックエンドに `sanitize-html` 導入

```bash
pnpm --filter @community-platform/api add sanitize-html
pnpm --filter @community-platform/api add -D @types/sanitize-html
```

### ステップ2: 共通サニタイザを `apps/api/src/common/utils/html-sanitizer.ts` に作成

```ts
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  "*": ["class"],
};

export function sanitizeRichText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}
```

### ステップ3: Broadcast 系で sanitize 適用

`apps/api/src/broadcasts/broadcasts.service.ts` の create / update メソッドで:

```ts
import { sanitizeRichText } from "../common/utils/html-sanitizer";

async create(dto: CreateBroadcastDto) {
  return this.prisma.broadcast.create({
    data: {
      ...dto,
      bodyHtml: sanitizeRichText(dto.bodyHtml),
    },
  });
}
```

`update` も同様に適用。`BroadcastTemplate.bodyHtmlTemplate` 系も同じ扱いに（管理者しか触らないが念のため）。

### ステップ4: BoardTopic.body / Memo.body 等の確認

これらは現状プレーンテキスト想定だが、テキストエリアで HTML タグが入った場合の挙動を確認:

- フロントで普通に React が `{body}` で出すなら自動エスケープされて安全
- もし `dangerouslySetInnerHTML` で出している箇所があれば（要 grep）、サニタイズか平文化を適用

→ `apps/web/**/*.tsx` を `dangerouslySetInnerHTML` で再度全 grep して、broadcast-detail 以外に該当箇所がないか確認するタスクを追加。

### ステップ5: フロントに DOMPurify 導入

```bash
pnpm --filter @community-platform/web add dompurify
pnpm --filter @community-platform/web add -D @types/dompurify
```

### ステップ6: 共通 SafeHtml コンポーネント

`apps/web/components/safe-html.tsx` を新設:

```tsx
"use client";

import DOMPurify from "dompurify";
import { useMemo } from "react";

interface Props {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: Props) {
  const sanitized = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "em",
          "u",
          "s",
          "h1",
          "h2",
          "h3",
          "h4",
          "ul",
          "ol",
          "li",
          "blockquote",
          "a",
          "img",
          "code",
          "pre",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
        ],
        ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt", "width", "height", "class"],
        ALLOW_DATA_ATTR: false,
        ADD_ATTR: ["target", "rel"],
      }),
    [html],
  );

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### ステップ7: broadcast-detail.tsx の改修

```tsx
// before
<div dangerouslySetInnerHTML={{ __html: broadcast.bodyHtml }} />;

// after
import { SafeHtml } from "@/components/safe-html";
<SafeHtml html={broadcast.bodyHtml} className="prose" />;
```

### ステップ8: SSR 環境での DOMPurify

DOMPurify は DOM API を使うのでサーバーサイドでは動かない。`SafeHtml` は `"use client"` で安全だが、もし RSC で HTML をサニタイズする必要が出たら `isomorphic-dompurify` を導入する（現状不要）。

### ステップ9: 入力フォームのフロント側予防（オプション）

リッチテキストエディタ未導入なので、現状は `<textarea>` に手動 HTML を貼るしかない。将来 TipTap 等を導入する際:

- TipTap の出力 HTML を保存前にバックエンドで sanitize-html 通す
- TipTap 自体も `sanitize` プラグインで XSS 防御済み

## テスト方針

### 単体テスト

`apps/api/src/common/utils/html-sanitizer.spec.ts`:

- `<script>alert(1)</script>` → 除去される
- `<img src=x onerror=alert(1)>` → onerror 削除
- `<a href="javascript:alert(1)">link</a>` → href 削除
- 許可タグ（`<p><strong>`）はそのまま残る
- 許可属性（`<a href="https://...">`）はそのまま、危険属性（`onclick`）は除去

### E2E テスト（Phase 11.5）

- 管理者として Broadcast に `<script>` を含む HTML を入力 → 保存後のレンダリングで script が実行されないことを確認

## 確定事項（2026-04-25）

- ✅ **二重サニタイズ**（バックエンド sanitize-html + フロント DOMPurify）を採用
- ✅ `BoardTopic.body` 等テキスト系フィールドは **プレーンテキストのまま維持**（リッチテキスト化は別フェーズ送り）
- ✅ 許可タグ・属性のリストは計画書の例のまま採用

## 残確認事項

- [ ] `SafeHtml` コンポーネントを `apps/web/components/` に置く方針で OK か（実装着手時に判断）
- [ ] `dangerouslySetInnerHTML` の他使用箇所を全 grep して洗い出すタスクは実装着手時に実施

## 成果物

- `apps/api/package.json`（sanitize-html 追加）
- `apps/api/src/common/utils/html-sanitizer.ts`
- `apps/api/src/common/utils/html-sanitizer.spec.ts`
- `apps/api/src/broadcasts/broadcasts.service.ts`（sanitize 適用）
- `apps/web/package.json`（dompurify 追加）
- `apps/web/components/safe-html.tsx`
- `apps/web/components/broadcasts/broadcast-detail.tsx`（SafeHtml に置換）
