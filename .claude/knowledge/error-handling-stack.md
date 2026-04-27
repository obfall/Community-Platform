# エラーハンドリング構成（設計思想と判断理由）

このプロジェクトで確立したエラーハンドリングの **考え方をまとめた文書**。コードのコピペ集ではなく、「なぜそう作ったか」「どこで何を判断したか」の記録。新機能を実装するとき・別プロジェクトで似たものを作るときに、この観点を読み返してから書く。

## 読み方

- 各層の **役割と境界** を理解する。コードは観点を支えるための例示
- 「標準から外れる選択」のセクションは、今後のメンテナで「なぜこうなっているのか」と疑問が出た時の答え

## 全体構成: 4層 + 構造化ログ

```
リクエスト
   │
   ├─[層1: NestJS 例外フィルタ + pino 構造化ログ]────────┐
   │   ・統一レスポンス形式に整形                        │
   │   ・ログレベル自動判定                              │
   │   ・x-request-id 発行（ログ・レスポンス・Sentry に串）│
   │   ・5xx と 403 のみ Sentry に送る                   │
   │   ・PII を redact                                   │
   │                                                    ▼
レスポンス ◄──[層3: API クライアント層]─[層4: Sentry 設定]
   │           ・QueryCache / MutationCache         ・id のみ setUser
   │             の onError でグローバル統合         ・beforeSend で再度 PII
   │           ・extractApiError で構造化アクセス     スクラブ + 4xx フィルタ
   │           ・トーストは同一 ID で重複抑止         ・release タグ・低 sampling
   │           ・WebSocket は connect_error /        ・Replay 統合
   │             disconnect で再接続トースト
   │                  │
   ▼                  ▼
[層2: Next.js Error Boundary]
   ・global-error.tsx（layout 崩壊時）
   ・app/error.tsx（root 配下共通）
   ・(dashboard)/error.tsx（dashboard 配下共通）
   ・特に重要なドメインのみ {feature}/error.tsx を配備
```

## 層1: バックエンド例外フィルタ + 構造化ログ

### 観点

**「サービス層は throw するだけ。整形・ログ・送信はフィルタが一元処理」** という分離。

サービスのコードに `logger.error(...) ; throw ...` の二重呼び出しが混ざると、出力箇所が分散して「同じエラーが2回ログに出る／片方で PII を redact し忘れる」事故が起きる。フィルタに集約することで:

- ログ出力は1箇所
- PII redact ポリシーも1箇所
- レスポンス整形も1箇所

### 統一レスポンス形式

API が返す JSON は `statusCode / code / message / errors? / requestId / path / timestamp` の7フィールドで固定。フロントは **`code` で分岐**、ユーザーには **`message`** を出す、調査が必要な時は **`requestId`** を控える、フォームは **`errors[]`** をフィールドに割り当てる。という役割分担。

`code` は単純な文字列定数（`USER_EMAIL_ALREADY_EXISTS` 等）で、`packages/shared/` に置いて API/フロントで共有する。**メッセージ文字列で分岐するな** という強い思想。i18n や文言調整で壊れる。

### 4 分岐の優先順

フィルタは投げられた例外を以下の優先順で正規化する:

1. `BusinessException`（独自） → そのまま使う
2. `HttpException`（NestJS 標準） → ステータスから `code` を推論
3. `Prisma.PrismaClientKnownRequestError` → `P2002→409 / P2025→404 / P2003→400` にマップ
4. その他の `Error` → `500 / INTERNAL_ERROR` + スタック隠蔽

**Prisma マッピングを入れた理由**: ORM 例外をそのまま 500 で返すと「メール重複」が「サーバーエラー」に化ける。フロントで適切な UI（「既に登録済みです」）を出すには、フィルタで意味を解釈してあげる必要がある。

**既存コードの段階移行**: 既に書かれている `throw new ConflictException(...)` 等は **温存**。新規だけ `BusinessException` を使う方針。一斉置換は差分が膨らむ割にリスクがあるため。

### ログレベル戦略

| レベル  | 条件           | 例                                                 |
| ------- | -------------- | -------------------------------------------------- |
| `error` | 5xx            | 未ハンドル例外、外部 API 500                       |
| `info`  | **401**        | JWT 期限切れ（毎日大量に出るのでノイズ化を避ける） |
| `warn`  | その他 4xx     | 権限なし、バリデーション失敗                       |
| `info`  | 想定内イベント | ログイン成功、主要な状態変化                       |
| `debug` | 開発のみ       | SQL、payload 詳細                                  |

**なぜ 401 を info に落とすか** が一番重要なポイント。これを `error` で出すと Sentry が認証切れの通知で埋まり、本物のバグが埋もれる。

### requestId（traceId）

`x-request-id` ヘッダを受信または自動生成して、

- ログ JSON の `requestId` フィールドに入る
- レスポンスヘッダにも返す
- レスポンス body にも入れる
- Sentry イベントの tag にも積む

ユーザーが「エラー出ました」と問い合わせて来た時、画面に表示された `requestId` でログ・Sentry を一発検索できる。**運用のトラブルシュート速度が桁違いに上がる**。

### PII redact（pino 側）

ヘッダ `authorization` `cookie`、body `password` `passwordHash` `token` 等は pino の `redact` 設定で **stdout に出る前に除去**。後段の Sentry でもさらに redact するが、ここで止めるのが第一防衛線。

### 参照ファイル

- `apps/api/src/common/exceptions/business.exception.ts`
- `apps/api/src/common/filters/all-exceptions.filter.ts`
- `apps/api/src/common/filters/all-exceptions.filter.spec.ts`
- `apps/api/src/app.module.ts`（`LoggerModule.forRoot` と `APP_FILTER` 登録）
- `apps/api/src/main.ts`（`bufferLogs` + `useLogger` + `ValidationPipe.exceptionFactory`）
- `packages/shared/src/constants/error-codes.ts`

## 層2: フロント Error Boundary（Next.js App Router）

### 観点

Next.js App Router は `error.tsx` をディレクトリに置くと、その配下のレンダーエラーを **そこで止めて表示する** 階層的な仕組み。これを生かして「上に行くほど汎用的なメッセージ」「下に行くほどドメイン固有のメッセージ」になるよう配置する。

階層フォールバックの順序:

1. `{feature}/error.tsx`（ドメイン固有、あれば）
2. `(dashboard)/error.tsx`（dashboard 共通）
3. `app/error.tsx`（root layout 内共通）
4. `app/global-error.tsx`（root layout も壊れた時の最後の砦）

### 配備の判断

**全機能にドメイン固有 error.tsx を作るのはアンチパターン**。共通フォールバックで足りる機能まで個別配置すると、文言の管理が分散して結局メンテされなくなる。

判断基準:

- 「ドメイン固有のリトライ文言」に意味がある機能のみ配備
- このプロジェクトでは events / board / videos / shop の 4 つのみ（一覧表示が中核で、データ取得失敗時にユーザーが何をすべきか個別の案内が要る）
- 他のドメイン（profile, settings, projects 等）は `(dashboard)/error.tsx` で吸収

### global-error.tsx の特殊性

`<html><body>` を独自に持つ必要がある（root layout が崩壊している前提なので Tailwind の class が解決できない）。スタイルは **インライン記述** にする。これは Next.js のドキュメントにも書かれている制約。

eventId をユーザーに見せて、Sentry の `showReportDialog` で「問題を報告」できるようにする。layout が無い状況なので、共通の `<ErrorFallback>` コンポーネントで括れない（Tailwind が効かない）点に注意。

### 共通 `<ErrorFallback>` の役割

各 `error.tsx` は薄いラッパで、本体は `apps/web/components/error-boundary.tsx` の `<ErrorFallback>` に集約。`title` `description` `showReportDialog` を props で受けて、文言の差し替えだけで使い回す。

### 参照ファイル

- `apps/web/components/error-boundary.tsx`
- `apps/web/app/error.tsx`
- `apps/web/app/(dashboard)/error.tsx`
- `apps/web/app/(dashboard)/{events,board,videos,shop}/error.tsx`
- `apps/web/app/global-error.tsx`

## 層3: API クライアント統一

### 観点

各ページが個別に `useMutation({ onError: (e) => toast.error(...) })` を書くと、

- 同じネットワーク障害で複数ページから複数トーストが出る
- メッセージ品質がページごとにバラバラ
- 5xx と 4xx で UX を変えるロジックが各ページに重複

そこで TanStack Query の `QueryCache.onError` / `MutationCache.onError` を使って **グローバル onError** に集約する。各 hook は何も書かなくてもデフォルトで適切なトーストが出る。

### 7分類のロジック

`handleApiError(error)` 関数1つに「どう振る舞うか」を集約:

| 入力                              | 振る舞い                                                |
| --------------------------------- | ------------------------------------------------------- |
| ネットワーク障害（response 無し） | トースト「ネットワーク接続を確認してください」          |
| API エラーだが形式不一致          | トースト「予期しないエラーが発生しました」+ Sentry 送信 |
| `code === VALIDATION_FAILED`      | 何もしない（フォーム側で `errors[]` を表示）            |
| `statusCode === 401`              | 何もしない（axios インターセプタが自動リフレッシュ）    |
| `statusCode === 403`              | トースト「権限がありません」                            |
| `statusCode >= 500`               | トースト + Sentry 送信 + requestId をコンテキスト付与   |
| その他 4xx（404, 409, 429 等）    | トースト（API のメッセージそのまま）                    |

### `meta.silentError` で抑止

フォームでフィールド別表示が必要な hook はトーストが邪魔になる。TanStack Query の `meta` フィールドに `silentError: true` を付けることで、グローバル onError を抑止して個別処理に切り替える。

実装例（観点を支えるための断片）:

```ts
useMutation({ mutationFn: ..., meta: { silentError: true } });
// onError 側で extractApiError(error)?.errors を取り出してフォームにマッピング
```

### 段階移行（重要）

既存のコードは `toast.error("...")` の直書きが大量にあった（186 箇所）。一斉削除はリスクが高いので、

- 新規 hook はグローバル onError 任せ
- 既存 `toast.error` は **同一 ID** （例: `id: "network-error"`）が付いていれば sonner が重複抑止してくれるため温存
- 機能を触るタイミングで都度移行

という段階アプローチ。新しい仕組みと既存実装が同居しても UX が破綻しない設計。

### axios インターセプタとの分担

`lib/api/client.ts` の axios インターセプタは **401 を自動リフレッシュ** する役割を残す。`failedQueue` でリフレッシュ中の他リクエストを待たせる典型パターン（JWT-SPA のデファクト）。リフレッシュ失敗時のみログイン画面リダイレクトする。

グローバル onError は **その上に乗る**: axios が 401 を吸収できれば onError には来ない。リフレッシュも失敗したら例外として上がってくるが、その時はもうログイン画面に飛ぶのでトーストは不要。

### WebSocket（socket.io）

REST と違って onError 統合は使えないので、`connect_error` `disconnect` `chat:error` の3種を直接ハンドリング。`io server disconnect` だけ手動再接続が必要、それ以外は socket.io が自動再接続する。

### 参照ファイル

- `apps/web/lib/api/error-handler.ts`
- `apps/web/lib/api/client.ts`
- `apps/web/app/providers.tsx`
- `apps/web/app/(dashboard)/chat/page.tsx`（WebSocket 部分）

## 層4: Sentry 設定

### 観点

Sentry は「正しく設定しないとノイズと PII を撒き散らすツール」になる。本番運用に耐える形に4つを揃える:

1. ユーザー紐付け（id のみ）
2. PII スクラビング（二重防御）
3. ノイズフィルタ（4xx を捨てる）
4. release タグでバージョン特定

### id のみ setUser

`Sentry.setUser({ id })` だけ呼ぶ。**email や name は送らない**。理由は GDPR / 個人情報保護観点。id（UUID）は SaaS 単体ではユーザー特定できず、社内で DB を引いて初めて特定できる。Sentry の SDK には email を送る例も多いが、近年のベストプラクティスは id のみ。

実装場所:

- API 側は **Interceptor**（middleware ではない）で req.user.id を `Sentry.setUser` に渡す
- middleware だと guard より前に走るので req.user がまだ無い

フロント側は user 状態の `useEffect` で、ログイン中は setUser、ログアウトで `setUser(null)`。ページリロード時の自動復元・logout API 失敗時もカバーされる。

### PII スクラブの二重防御

| 経路                               | スクラブ場所                    |
| ---------------------------------- | ------------------------------- |
| stdout ログ → Railway 等のログ収集 | pino の `redact` 設定           |
| エラー → Sentry                    | `beforeSend` の `scrubPii` 関数 |

両方必要。pino 側で止めても、Sentry SDK は別経路でリクエストの body / headers を拾うため。`PII_KEY_PATTERN` という正規表現で `password / token / secret / authorization / refreshToken / accessToken` を持つキーを再帰的に `[Filtered]` に置換する。

新しい機密フィールドを扱う場合は、この正規表現に追加するのを忘れない。

### 4xx の Sentry 送信判断

「全部送る」と Sentry のクオータが食われ、本物のバグがノイズに埋もれる。送る/捨てるを以下で決めている:

| ステータス | 送信       | 理由                               |
| ---------- | ---------- | ---------------------------------- |
| 401        | ❌         | JWT 期限切れは日常的、ノイズ       |
| 400 / 422  | ❌         | フロント入力ミスがほとんど         |
| 404        | ❌         | スパム的にスキャンされる           |
| 403        | ✅ warning | 攻撃検知の可能性、運用で把握したい |
| 5xx        | ✅ error   | 本物のバグ                         |

**フィルタは2か所に書く**: 層1 のフィルタの `reportToSentry` でも判定し、`instrument.ts` の `beforeSend` でも判定する。両方で防ぐと取りこぼしが無い。

### サンプリング率

| 種別             | 本番                          | 開発 |
| ---------------- | ----------------------------- | ---- |
| Errors           | 100%                          | 100% |
| Traces           | 10% (`tracesSampleRate: 0.1`) | 100% |
| Replay (Session) | 10%                           | —    |
| Replay (OnError) | 100%                          | —    |

エラーは取りこぼし厳禁なので 100%、Traces はクオータ消費が大きいので 10%。中規模アプリの妥当な水準。

### release タグ

`process.env.RAILWAY_GIT_COMMIT_SHA` `VERCEL_GIT_COMMIT_SHA` を `release` に渡す。デプロイプラットフォームが自動でセットする env を使うのがコツ。これでエラーが「どのコミットで起きたか」が分かる。あわせて `withSentryConfig` でビルド時にソースマップが Sentry にアップロードされ、TS の元行番号でスタックトレースが見られる。

### 参照ファイル

- `apps/api/src/instrument.ts`
- `apps/api/src/common/interceptors/sentry-user.interceptor.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`
- `apps/web/instrumentation-client.ts`
- `apps/web/hooks/auth/use-auth.tsx`（Sentry.setUser useEffect）

## ライブラリ選定の根拠

| 用途              | 採用                                | 採用理由                                                                   |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| バックロガー      | `pino` + `nestjs-pino`              | Node.js で最速クラス、JSON デフォルト、NestJS 公式連携で `req.id` 自動付与 |
| トースト          | `sonner`                            | shadcn/ui エコシステムと統一、同一 ID 重複抑止が標準機能                   |
| データフェッチ    | `@tanstack/react-query` v5          | `QueryCache.onError` / `MutationCache.onError` のグローバル統合が綺麗      |
| HTTP クライアント | `axios`                             | interceptor で 401 リフレッシュトークン処理が書きやすい                    |
| エラー監視        | `@sentry/nestjs` + `@sentry/nextjs` | Replay 統合、ソースマップ自動アップロード、breadcrumb が成熟               |
| WebSocket         | `socket.io-client`                  | 自動再接続・event 抽象化が標準実装                                         |

選定で迷わないこと: それぞれ事実上のデファクト。ここを変えるなら強い理由が必要。

## 標準から外れる選択（意識して採用したもの）

将来「なぜこうなっているのか」と疑問が出た時用の記録。

### 1. `SentryGlobalFilter` を使わず自前 filter で `Sentry.captureException`

公式の推奨は `SentryGlobalFilter` をフィルタチェーンに残す方式。今回は **自前 `AllExceptionsFilter` の中で `Sentry.captureException` を呼ぶ**形にした。

理由: ログ出力・レスポンス整形・Sentry 送信を1か所で凝集させたかった。filter ・ logging interceptor ・ Sentry filter の3つに分散すると「どれが先に走るか」「どれで PII を redact するか」が読みにくい。

リスク: Sentry の自動計装（HTTP request span 等）の挙動が公式ルートと変わる可能性。大規模化したら公式パターンに戻すことも検討の余地あり。

### 2. Sentry user 紐付けを Interceptor で実装

公式サンプルは middleware が多い。今回は middleware では req.user が見えない（guard より前に走る）ため Interceptor を採用。これは制約上の正解。

### 3. ログ出力 + Sentry 送信を Filter が担当

別 Interceptor に分離する流派もある。凝集度を優先して 1 か所にまとめた。

## 新機能を実装する時の判断フロー

このプロジェクト・別プロジェクトを問わず、新機能で API 通信・例外を扱う時に確認する観点:

### バック側

1. 投げる例外は `BusinessException(ErrorCode.X, status, message)` か?
   - NestJS 標準の `ConflictException` 等は新規では使わない
   - 必要な ErrorCode が無ければ `packages/shared/src/constants/error-codes.ts` に追加
2. サービス内で `logger.error + throw` の二重出力をしていないか?（フィルタが一元処理）
3. Prisma エラーは生で投げて OK（フィルタが自動マッピング）
4. ユーザー入力を受ける DTO は ValidationPipe + class-validator で検証 → 自動で `VALIDATION_FAILED` に整形される

### フロント側

1. `useQuery` / `useMutation` で個別 `onError + toast.error` を書いていないか?（providers のグローバル onError 任せ）
2. フォームでフィールド別表示が必要なら `meta: { silentError: true }` を付け、`onError` 側で `extractApiError(error)?.errors` を取り出してマッピング
3. どうしても直接 `toast.error` が必要な場合、同一 `id` を付けて重複抑止
4. 新規ドメイン（`app/(dashboard)/{feature}/`）を追加する場合、`(dashboard)/error.tsx` の共通フォールバックで足りるか判断。ドメイン固有メッセージが必要なら `{feature}/error.tsx` を配備
5. API エラーの分岐は `error.code === ErrorCode.XXX` で（メッセージ文字列比較は禁止）

### 監視

1. `Sentry.setUser` を新規箇所で呼ばない（`use-auth.tsx` と `SentryUserInterceptor` のみが正規ルート）
2. `Sentry.captureException(err, { extra: ... })` の `extra` に機密キーを直接入れていないか（`PII_KEY_PATTERN` でスクラブされるが、新キー名は正規表現に追加が必要）

## 関連ドキュメント

- プロジェクトの規約サマリ: `CLAUDE.md` の「エラーハンドリング規約」セクション
- セルフレビュー項目: `.claude/skills/review/SKILL.md` の「エラーハンドリング」セクション

## 履歴

- 2026-04-28: 初版（Phase 11.3 実装完了時）
