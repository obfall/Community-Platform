# CLAUDE.md

このファイルはプロジェクトの開発ルール・設計方針を記述する。Claude Code および開発者が参照する。

## コミット・ブランチ運用

- コミットメッセージは日本語（例: `feat: Phase 0.3 NestJS 初期化（...）`）
- 作業開始時に feature ブランチを作成（例: `feature/phase-1.2-auth`）
- git commit / git push は明示的な指示があるまで実行しない

## フォルダ構成 — Feature-based structure

ページ・hooks・API クライアント・バックエンドの4層を **同じドメイン名** で統一する。

```
app/(dashboard)/{feature}/         ← ページ
hooks/{feature}/use-{feature}.ts   ← hooks（ドメイン別サブディレクトリ）
lib/api/{feature}.ts               ← API クライアント
apps/api/src/{feature}/            ← NestJS モジュール
```

### 例: 新機能「recipes」を追加する場合

```
app/(dashboard)/recipes/           ← ページ群
hooks/recipes/use-recipes.ts       ← hooks
lib/api/recipes.ts                 ← API クライアント
apps/api/src/recipes/              ← NestJS モジュール
```

### ルール

- 命名に迷ったらページフォルダ名を基準にする
- settings 関連の hooks は `hooks/settings/` にまとめる
- ページ特有コンポーネントは `_components/` 配下に置く（Next.js のルーティング除外慣習）
- 共有コンポーネントは `apps/web/components/` に置く

## 実装方針

- **既存資産の再利用を優先する**: 自走で実装する際は、新しくコンポーネント・hooks・API クライアント・ユーティリティを作る前に、既存のもので実装できないか必ず確認する
  - UI: `apps/web/components/` および該当 feature の `_components/`
  - hooks: `hooks/{feature}/` および共通 hooks
  - API クライアント: `lib/api/`
- **既存の拡張・新規作成はユーザーに確認する**: そのまま使える既存資産が見つからなかった場合、実装に入る前に以下をユーザーに確認する
  - どの既存資産を拡張するか（候補とその拡張内容）
  - もしくは新規作成が必要な理由（既存では満たせない要件）
  - 確認を得てから実装に着手する

## テスト規約

- **`describe` / `it` のテキストは日本語で書く**。「何をテストしているか」が一目で分かるように
  - 例: `describe("isLocked: ロック判定", () => { it("失敗回数が閾値（5回）に達したらロック中になる", ...) })`
  - クラス名・関数名は識別子として残し、説明部分を日本語で付ける（例: `describe("LoginAttemptService", ...)` の中に `describe("isLocked: ロック判定", ...)` を入れ子にする）
  - `expect(...).toBe(...)` などのアサーション本体は英語のまま（API のため）
- ファイル名はレイヤー別に拡張子を分ける:
  - **バック (`apps/api/`)**: `*.spec.ts`（NestJS / Jest の慣例）
  - **フロント (`apps/web/`) 単体テスト**: `*.test.ts` / `*.test.tsx`（Vitest 等を想定、現状未導入。今後の単体テストはこの形で追加）
  - **E2E (`apps/web/e2e/`)**: `*.spec.ts`（Playwright の慣例、既存）

## エラーハンドリング規約（Phase 11.3 で確立）

**新機能を実装する前に必ず `.claude/knowledge/error-handling-stack.md` を参照する**（4 層構成の設計思想・各層の判断理由・新機能実装時の判断フローを記載）。

主な観点（詳細はナレッジへ）:

- バック: 業務エラーは `BusinessException`、ログ出力・Sentry 送信・整形は `AllExceptionsFilter` が一元処理
- フロント: API エラーのトーストはグローバル `QueryCache.onError` 任せ、個別 `onError + toast.error` を書かない
- Sentry: `setUser` は id のみ、PII は `beforeSend` で再度スクラブ

## セキュリティ規約（Phase 11.4 で確立）

**新機能を実装する前に必ず `.claude/knowledge/security-hardening-stack.md` を参照する**（5 層構成の設計思想・各層の判断理由・新機能実装時の判断フローを記載）。

主な観点（詳細はナレッジへ）:

- バック: 重い処理・認証系は `@Throttle({ strict })`、HTML 入力は保存前に `sanitizeRichText()`、ファイルは `validateFileMagic` + `sanitizeFilename`
- フロント: ユーザー入力 HTML は `<SafeHtml>` で描画（`dangerouslySetInnerHTML` 直書き禁止）、ファイルアップロードは `validateFileBeforeUpload()` で事前チェック
- 外部ドメイン追加時は `apps/web/next.config.ts` の CSP `buildCsp()` に対応する `*-src` を追加

## マイグレーション運用

### 新規テーブル追加時は RLS を必ず有効化する

Supabase は anon key 経由で public スキーマのテーブルを REST 公開するため、RLS が無効だと Security Advisor から警告を受ける。NestJS API は postgres ロール直接接続で RLS をバイパスするので、ポリシー未定義（deny all）で問題ない。

- 新規 `CREATE TABLE` を追加するマイグレーションには、**必ず同じファイル内で** `ALTER TABLE "テーブル名" ENABLE ROW LEVEL SECURITY;` を追加する
- 全テーブル一括有効化は `20260409002206_enable_rls_all_tables` で実施済み（以後の新規テーブルは個別対応）

### 既存マイグレーションを編集しない

適用済みマイグレーションを後から書き換えると `prisma migrate dev` がチェックサム不一致を検知し、開発DBのリセットを要求する（データ消失）。修正が必要な場合は新規マイグレーションを追加する。

### マイグレーションのファイル名は時系列順を担保する

Prisma はディレクトリ名のアルファベット順で適用するため、同日中に複数追加する場合は `YYYYMMDDHHMMSS_xxx` 形式で時刻を含めて順序を明示する（例: `20260417235959_xxx` を `20260417_yyy` の後に走らせる）。

## 計画ドキュメント

**`/plan` スキルを使った場合のみ**、作成した計画をマークダウンファイルとして残す（通常の会話ベースの設計共有では作成不要）。

- 出力先: `docs/plans/{feature}/`
- `{feature}` は `app/(dashboard)/{feature}/` / `apps/api/src/{feature}/` と **同じドメイン名** に合わせる（フォルダ構成ルールと同じ基準）
- 共通機能や横断的な変更など既存ドメイン名に合わない場合は、内容がわかる柔軟な名前でフォルダを作成してよい
- ファイル名はスコープがわかるケバブケース（例: `owner-edit.md`, `photo-upload-on-create.md`）
- 記載内容: 背景・現状調査・実装方針・既存資産の利用可否・影響範囲
