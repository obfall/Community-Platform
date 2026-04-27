---
name: review
description: コードをプロジェクト規約に照らしてセルフレビュー。指摘事項のみを抽出し、修正は行わない。
argument-hint: "[file-or-directory-path]"
disable-model-invocation: true
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob, Write, Bash
---

# プロジェクト規約レビュー（セルフレビュー専用）

対象: `$ARGUMENTS`

指定されたファイルまたはディレクトリ内の全コードを読み取り、以下のチェック項目に従ってレビューを行う。

## 重要な原則

- **このスキルはコードを修正しない**。指摘事項を抽出するだけ。
- ユーザー自身が指摘事項を読み、**どれを直すか・直さないかを判断する**ためのツール。
- レビュー結果は必ず `docs/reviews/` に保存し、後で見返せるようにする。
- 修正判断のしやすさのため、指摘事項は **3 段階の優先度** で分類する。

---

## バックエンドチェック項目（`apps/api/` 配下）

### 構造

1. **モジュール分離**: `module.ts` / `controller.ts` / `service.ts` / `dto/` に正しく分離されているか
2. **依存関係**: サービスがコントローラに直接DBアクセスコードが書かれていないか（サービス経由であること）

### バリデーション・DTO

3. **Zodスキーマ使用**: DTOが `packages/shared/src/validators/` のZodスキーマをインポートして使用しているか
4. **入力検証**: コントローラの全エンドポイントで入力バリデーションが行われているか

### 認証・認可

5. **JwtAuthGuard**: 認証が必要なエンドポイントに `@UseGuards(JwtAuthGuard)` が適用されているか
6. **RolesGuard**: ロール制限が必要なエンドポイントに `@Roles()` + `RolesGuard` が適用されているか
7. **FeatureGuard**: モジュールレベルで機能トグルガードが適用されているか

### API設計

8. **Swaggerデコレータ**: 全エンドポイントに `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()` があるか
9. **ページネーション**: 一覧APIが `skip`/`take` によるページネーションに対応しているか
10. **HTTPステータス**: 適切なHTTPステータスコードを返しているか（201 Created, 204 No Content 等）

### データアクセス

11. **論理削除**: 取得クエリに `where: { deleted_at: null }` が含まれているか（該当テーブルの場合）
12. **削除処理**: `delete` ではなく `update({ deleted_at: new Date() })` を使用しているか
13. **N+1回避**: Prisma の `include` / `select` が適切に使われ、不要なデータを取得していないか
14. **トランザクション**: 複数テーブルの更新が `prisma.$transaction()` で包まれているか

### エラーハンドリング（Phase 11.3 規約）

15. **BusinessException 使用**: 新規実装で業務エラーを投げる時、`BusinessException(ErrorCode.XXX, HttpStatus.YYY, "...")` を使っているか（NestJS 標準 `ConflictException` 等は新規では避ける、既存温存は OK）
16. **ErrorCode の置き場所**: 新規 ErrorCode が `packages/shared/src/constants/error-codes.ts` に追加されているか（API/フロント共有のため）
17. **二重出力禁止**: サービス内で `logger.error(...)` の直後に `throw` していないか（`AllExceptionsFilter` がログ出力・Sentry送信・統一レスポンス整形を一元的に行う）
18. **Prisma エラー**: `try/catch` で Prisma エラーを掴んで独自処理していないか（`P2002`/`P2025`/`P2003` はフィルタが自動で 409/404/400 に変換するので投げっぱなしで OK）
19. **エラーメッセージの情報漏洩**: ユーザーに内部情報（DB名・スタックトレース・内部 ID 等）を漏らすメッセージがないか

---

## フロントエンドチェック項目（`apps/web/` 配下）

### データ取得

1. **TanStack Queryパターン**: `hooks/use-{entity}.ts` → `lib/api/{entity}.ts` のパターンに従っているか
2. **直接fetch禁止**: コンポーネント内で直接 `fetch()` を呼んでいないか

### UIコンポーネント

3. **shadcn/ui使用**: Button, Input, Dialog, Table 等は shadcn/ui のコンポーネントを使用しているか
4. **独自コンポーネント乱立**: shadcn/ui で代替できる独自コンポーネントがないか

### フォーム

5. **Zodバリデーション**: フォームのバリデーションに `packages/shared` のZodスキーマを使用しているか
6. **React Hook Form**: フォーム管理に React Hook Form + `@hookform/resolvers/zod` を使用しているか

### UX

7. **ローディング状態**: データ取得中にローディングUIを表示しているか
8. **エラー状態**: エラー発生時にユーザーにわかりやすいメッセージを表示しているか
9. **空状態**: データが0件の場合に適切なメッセージを表示しているか
10. **レスポンシブ**: モバイル表示に対応したスタイリングがあるか（Tailwind の `sm:`, `md:`, `lg:` 等）

### エラーハンドリング（Phase 11.3 規約）

11. **個別 onError + toast.error の禁止**: `useQuery` / `useMutation` で `onError: (e) => toast.error(...)` を新規で書いていないか（`providers.tsx` の `QueryCache.onError` がグローバルに表示するため重複になる）
12. **silentError の適用**: フォーム送信などフィールド別エラー表示が必要な hook で `meta: { silentError: true }` を付けているか（グローバル onError を抑止して `extractApiError(error)` で `errors[]` を取り出す前提）
13. **toast.error 直書きの ID**: どうしても直書きが必要な場合に `toast.error("...", { id: "..." })` で同一 ID を付けて重複抑止しているか
14. **error.tsx 配備の判断**: 新規ドメイン（`app/(dashboard)/{feature}/`）で「ドメイン固有のリトライ文言が必要」と判断した場合のみ `{feature}/error.tsx` を配備しているか（共通フォールバックは `(dashboard)/error.tsx`、既存固有配備は events / board / videos / shop の 4 つ）
15. **API エラーの構造化アクセス**: `error.message` 文字列比較ではなく `extractApiError(error)?.code === ErrorCode.XXX` で分岐しているか

---

## セキュリティチェック項目

### XSS / 入出力サニタイズ

1. **`dangerouslySetInnerHTML` 使用時のサニタイズ**: 直接 `__html: value` で渡していないか。共通の `<SafeHtml html={...} />`（`apps/web/components/safe-html.tsx`）または DOMPurify 経由になっているか
2. **バックエンド HTML 入力サニタイズ**: ユーザー入力 HTML を DB 保存する前に `sanitize-html`（`apps/api/src/common/utils/html-sanitizer.ts`）を通しているか（Broadcast.bodyHtml 等）
3. **テキストフィールドの想定外 HTML 化**: プレーンテキスト想定のフィールド（BoardTopic.body 等）を意図せず `dangerouslySetInnerHTML` で出していないか
4. **URL スキーム検証**: ユーザー入力 URL を href / src に流す時、`javascript:` / `data:` 等の危険スキームを除外しているか
5. **Markdown レンダラの出力**: Markdown → HTML 変換結果も DOMPurify でサニタイズされているか

### 認証・認可

6. **JwtAuthGuard 適用**: 認証必須エンドポイントに `@UseGuards(JwtAuthGuard)` が付いているか
7. **`@Public` デコレータの妥当性**: 公開エンドポイントが意図的に公開されているか（コメントで理由明記）
8. **RolesGuard / @Roles**: 管理者・オーナー専用エンドポイントに適用されているか
9. **サービス層での所有者チェック**: 「自分のリソースしか操作できない」要件で `where: { userId: currentUserId }` を必ず入れているか
10. **横断アクセス防止**: ID で直接取得する系（`findById`）で他ユーザーのリソースを読めないか
11. **権限昇格防止**: ユーザーが自分の `role` / `isAdmin` / `rankId` を update できる経路がないか
12. **JWT 取扱**: トークンをログ出力・URL クエリ・レスポンス本文に含めていないか（Authorization ヘッダのみ）

### ファイルアップロード

13. **MIME ホワイトリスト**: `apps/api/src/files/files.service.ts` のカテゴリ別 MIME 許可リストに従っているか
14. **サイズ上限**: multer の `fileSize` + サービス層のカテゴリ別上限が両方適用されているか
15. **Magic Number 検証**: file-type で実ファイル種別を判定し、Content-Type と一致確認しているか（拡張子偽装対策）
16. **ファイル名 sanitize**: `..` / NULL バイト / 制御文字 / path separator を除去しているか
17. **画像再エンコード**: 画像は sharp で再エンコードして埋め込みデータを除去しているか
18. **保存ファイル名**: 生のオリジナル名で保存せず、UUID 等で置換しているか（パストラバーサル防御）

### レートリミット・ブルートフォース対策

19. **新規エンドポイントの @Throttle**: 認証系・パスワードリセット系・重い処理に `@Throttle({ strict: { limit: 5, ttl: 60_000 } })` を付けているか
20. **ログイン処理**: `LoginAttemptService.isLocked()` でアカウントロック判定が呼ばれているか
21. **WebSocket メッセージハンドラ**: `@SubscribeMessage(...)` 内で `WsRateLimiter.check(client.id)` を呼んでいるか
22. **`@SkipThrottle` の妥当性**: ヘルスチェックや CSP report 以外で安易に `@SkipThrottle` していないか

### 機密情報・ログ

23. **レスポンスから機密フィールド除外**: `passwordHash` / `passwordResetToken` / `refreshToken` / `accessToken` 等が API レスポンスに含まれていないか（Prisma `select` で明示除外）
24. **ログのレダクション**: pino の `redact` 設定（`apps/api/src/app.module.ts`）でカバーされない経路で `logger.info({ password })` 等を書いていないか
25. **環境変数のハードコード禁止**: 文字列リテラルで API キー・URL・パスワードを直書きしていないか
26. **`console.log` のステージング/本番混入**: デバッグ用 `console.log` を消し忘れていないか（特に機密データ出力）
27. **エラーメッセージから情報漏洩**: 「ユーザーが存在しません」と「パスワードが違います」を区別しない（メール総当たり対策）
28. **Sentry.setUser の PII**: `Sentry.setUser({ ... })` に `email` / `username` / `name` を渡していないか（`id` のみが規約。`use-auth.tsx` と `SentryUserInterceptor` のみが setUser を呼ぶ唯一の正規ルート）
29. **Sentry beforeSend の迂回**: `Sentry.captureException(err, { extra: { ... } })` の `extra` に password / token / authorization 系のフィールドを直接入れていないか（`PII_KEY_PATTERN` でスクラブされるが、新規キー名は正規表現に追加が必要）

### SQL インジェクション

30. **`$queryRaw` / `$executeRaw`**: 使用している場合、必ずタグ付きテンプレート（`Prisma.sql`）でパラメータ化されているか。文字列連結 NG
31. **動的 ORDER BY / LIMIT**: ユーザー入力をそのまま埋め込んでいないか（ホワイトリスト経由で検証）

### HTTP セキュリティヘッダー

32. **新規ドメイン追加時の CSP**: 外部 API / CDN / 画像ホスト等を追加した時、`apps/web/next.config.ts` の CSP `connect-src` / `img-src` / `script-src` 等に追加しているか
33. **iframe 利用時**: 自前で iframe を埋め込む場合、`frame-src` を CSP に追加しているか
34. **CORS 拡張**: 新規 origin を許可する場合、ハードコードではなく `CORS_ORIGIN` 環境変数経由か

### CSRF

35. **Cookie 認証への変更**: 現在は JWT を Authorization ヘッダで送る設計（CSRF 不要）。Cookie 認証を導入する PR では CSRF トークン対応を必須化

### 依存追加

36. **新規 npm パッケージ**: メンテナンスされているか（最終更新・スター数・既知脆弱性 / `pnpm audit`）
37. **lockfile**: `pnpm-lock.yaml` の差分が想定外に大きくないか（typosquatting 対策）

### Secrets 管理

38. **`.env` のコミット禁止**: PR 差分に `.env` / `.env.local` 系が含まれていないか
39. **`.env.example` の同期**: 新規環境変数を追加した時、example ファイルにも反映されているか
40. **環境変数のスキーマ**: `apps/api/src/config/env.schema.ts` の Zod スキーマに新規変数を追加しているか

---

## 結果の保存（必須）

レビュー実施後、結果は **必ず** マークダウンファイルとして保存する。会話への出力だけで終わらせず、後で見返せる形で残す。

### 保存先

```
docs/reviews/{YYYY-MM-DD}-{scope-slug}.md
```

- **YYYY-MM-DD**: 実行日。Bash で `date +%Y-%m-%d` で取得
- **scope-slug**: レビュー対象パスをスラッシュ→ハイフン変換、`apps/`, `src/` 等の冗長部分は除去して短く
  - 例: `apps/api/src/board/` → `board`
  - 例: `apps/web/app/(dashboard)/events/` → `events`
  - 例: `apps/api/src/board/board.service.ts` → `board-service`
  - 例: ファイル単位ではなくドメイン全体なら → `board` のように圧縮

複数回同じスコープをレビューする日は末尾に連番（`-2`, `-3`...）を付与:

```
docs/reviews/2026-04-25-board.md
docs/reviews/2026-04-25-board-2.md
docs/reviews/2026-04-25-board-3.md
```

### 保存ファイルのフォーマット

```markdown
---
date: 2026-04-25
scope: apps/api/src/board/
branch: feature/phase-11.2-perf
reviewer: claude-code (/review)
total_findings: 8
high: 2
medium: 3
low: 3
checked_items: 74
---

# レビュー結果: apps/api/src/board/

> ⚠ このレビューは **指摘のみ** で、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。

## 指摘事項（8 件）

### 🔴 高（2 件） — セキュリティ・データ不整合・本番障害につながる規約違反

- **`apps/api/src/board/board.controller.ts:18`** — `@UseGuards(JwtAuthGuard)` 抜け
  - 認証必須エンドポイントが公開状態
  - 修正案: コントローラ全体に `@UseGuards(JwtAuthGuard)` を付ける、または該当 method に個別付与
  - 関連: `docs/plans/security-hardening/01-http-headers.md`

- **`apps/api/src/board/board.service.ts:152`** — レスポンスに `passwordHash` が含まれる可能性
  - `include: { author: true }` で User 全フィールド取得 → API レスポンスに `passwordHash` が漏れている
  - 修正案: `select: { author: { select: USER_PUBLIC_SELECT } }` に変更
  - 関連: `docs/plans/performance/02-backend-perf.md`

### 🟡 中（3 件） — 保守性・パフォーマンスへの中程度の影響

- **`apps/api/src/board/board.service.ts:78`** — `getTopicStats` で全件メモリ集計
  - O(n) のメモリ集計、トピックが多くなると遅延
  - 修正案: `prisma.boardTopic.groupBy({ by: ['categoryId'], _count: ... })` に置換
  - 関連: `docs/plans/performance/02-backend-perf.md`

- **`apps/api/src/board/dto/topic-query.dto.ts:25`** — `@Max(100)` 上限指定なし
  - 攻撃者が `?limit=10000` を送れる
  - 修正案: 共通 `PaginationDto` を extends する
  - 関連: `docs/plans/performance/05-network-perf.md`

- **`apps/api/src/board/board.service.ts:240`** — トランザクション内で外部 API 呼び出し
  - DB トランザクション中に外部 API（Resend）を呼ぶと、長時間ロック発生
  - 修正案: トランザクション外で別途呼び出し or BullMQ ジョブキュー化

### 🟢 低（3 件） — コード品質・スタイル・将来的な改善候補

- **`apps/api/src/board/board.module.ts:15`** — 未使用 import
  - `BoardSearchService` を import しているが Provider に登録していない
  - 修正案: 使わないなら import 削除、使うなら providers 配列に追加

- **`apps/api/src/board/board.controller.ts:42`** — 関数長過大（80 行）
  - 1 メソッドに分岐が多すぎる
  - 修正案: 集計ロジック等を private メソッドに切り出し

- **`apps/api/src/board/board.service.ts:301`** — マジックナンバー
  - `30 * 60 * 1000` のような数値直書き
  - 修正案: `const TOPIC_LOCK_DURATION_MS = 30 * 60 * 1000;` のように定数化

## 良い点

- `apps/api/src/board/board.service.ts:120` — Prisma `$transaction` で投稿+カテゴリ更新を atomic にしている
- `apps/api/src/board/board.controller.ts:35` — `@ApiResponse` で全ステータスコードが定義されている

## サマリー

- チェック項目: 74 項目（バックエンド 19 + フロントエンド 15 + セキュリティ 40）
- 問題なし: 56 項目
- 指摘あり: 8 項目（🔴 高 2 / 🟡 中 3 / 🟢 低 3）

## 関連

- 前回レビュー: `docs/reviews/2026-04-20-board.md`（あれば）
- 関連計画: `docs/plans/security-hardening/`, `docs/plans/performance/`
```

### 保存手順（Skill 実行時の動作）

1. レビューを完了する
2. 上記フォーマットで結果文字列を組み立てる
3. `Bash` で `mkdir -p docs/reviews` 実行（初回のみ必要だが冪等なので毎回 OK）
4. `Bash` で `date +%Y-%m-%d` を取得して `YYYY-MM-DD` を確定
5. 既存ファイル名重複チェック（同日同 scope の場合は連番）
6. `Write` ツールで `docs/reviews/{filename}.md` を作成
7. 最後に会話に **保存先パス + サマリー** を返す（詳細は md 参照）

### 優先度の定義（3 段階）

| マーク | 優先度 | 内容                                                         | 対応の目安                            |
| ------ | ------ | ------------------------------------------------------------ | ------------------------------------- |
| 🔴     | **高** | セキュリティリスク・データ不整合・本番障害につながる規約違反 | リリース前 / マージ前に修正必須       |
| 🟡     | **中** | 保守性・パフォーマンスへの中程度の影響、暫定運用は可         | 次のスプリント等で計画的に修正        |
| 🟢     | **低** | コード品質・スタイル・将来の改善候補、影響軽微               | 余裕がある時 / 該当箇所を触る時に対応 |

判定の指針:

- **高にする条件**: 認証/認可漏れ・XSS/SQLi 等のセキュリティ問題・本番データ破損・規約に明確違反
- **中にする条件**: パフォーマンス低下・コード重複・型安全性の欠如・将来のバグ温床
- **低にする条件**: 命名・コメント・マジックナンバー・小規模リファクタ

### 会話への出力（保存後の最終応答）

長大な詳細はファイルに任せて、会話側はサマリーと **高だけ抜粋** で:

```markdown
✅ レビュー完了 — 保存先: `docs/reviews/2026-04-25-board.md`

### サマリー

- 指摘事項 8 件（🔴 高 2 / 🟡 中 3 / 🟢 低 3）
- 良い点 2 件

### 🔴 高優先（2 件） — リリース前必須対応

1. `board.controller.ts:18` — `@UseGuards(JwtAuthGuard)` 抜け
2. `board.service.ts:152` — レスポンスに `passwordHash` 漏洩リスク

### 🟡 中優先（3 件）, 🟢 低優先（3 件）

詳細は保存ファイルを参照してください。

> ⚠ このレビューは指摘のみ。修正は自身で判断してください。
```
