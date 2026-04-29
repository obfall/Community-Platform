# セキュリティ強化構成（設計思想と判断理由）

このプロジェクトで Phase 11.4（2026-04-30）に確立したセキュリティ強化の **考え方をまとめた文書**。コードのコピペ集ではなく、「なぜそう作ったか」「どこで何を判断したか」の記録。新機能を実装するとき・別プロジェクトで似たものを作るときに、この観点を読み返してから書く。

エラーハンドリング基盤（`error-handling-stack.md`）と並ぶ「Day 1 で整える品質基盤」の片割れ。

## 読み方

- 各層の **役割と境界** を理解する。コードは観点を支えるための例示
- 実装の現物は本プロジェクト内のファイルを参照する（セクション末尾に場所明記）
- 「標準から外れる選択」のセクションは、今後のメンテナで「なぜこうなっているのか」と疑問が出た時の答え

## 全体構成: 5 層

```
                        [攻撃面]
                            │
        ┌───────────────────┼─────────────────────┐
        │                   │                     │
        ▼                   ▼                     ▼
[層1: HTTP ヘッダー]  [層2: XSS]            [層3: ファイル]
 ・CORS 詳細化       ・バック sanitize-html   ・Magic Number 検証
 ・Helmet カスタム    ・フロント DOMPurify    ・ファイル名サニタイズ
 ・CSP Report-Only    （二重防御）          ・サイズ別上限
 ・HSTS / Referrer
        │                   │                     │
        └───────────────────┼─────────────────────┘
                            │
                            ▼
                     [層4: レートリミット]
                      ・IP（既定 60/min）
                      ・個別（認証 5/min, アップロード 10/min）
                      ・アカウントロック（5 失敗で 15 分）
                      ・WebSocket（30/min/接続）
                            │
                            ▼
                  [層5: 依存・秘密情報]
                   ・pnpm audit を CI で自動検知
                   ・gitleaks（pre-commit + CI）
                   ・pnpm overrides で間接依存を強制更新
```

## 層1: HTTP セキュリティヘッダー

### 観点

ヘッダー単独で攻撃を完全には防げないが、**ブラウザ側の挙動を制限してリスクを減らす** 第一防衛線。古典的な攻撃（クリックジャッキング・MIME 推測攻撃・中間者攻撃）の多くは適切なヘッダーを返すだけで無効化できる。

### CORS の詳細化

デフォルトの `app.enableCors({ origin })` だけだと `methods` `allowedHeaders` が **全許可**。明示的に絞ると Swagger 等の不要な OPTIONS パスが拒否されてバグの原因になる**ので、許可リストは慎重に決める**。

判断:

- `methods`: 実際に使う `GET / POST / PUT / PATCH / DELETE / OPTIONS` に限定
- `allowedHeaders`: `Content-Type / Authorization / X-Request-Id / X-Requested-With` に限定
- `exposedHeaders`: `X-Request-Id` を明示してフロントから読み取り可能に（Phase 11.3 の requestId と連携）
- `CORS_ORIGIN` は **カンマ区切り複数 origin 対応**（本番・staging を 1 env で管理）
- `maxAge: 86400` で preflight をキャッシュ（同 origin から繰り返しアクセスでも軽量）

### Helmet のカスタム設定

`helmet()` のデフォルトでも 11 種類のヘッダーが付くが、明示すべきもの:

- `hsts` の `maxAge / includeSubDomains / preload` を本番想定（1 年）
- `frameguard: deny` で iframe 埋め込み禁止
- `referrerPolicy: strict-origin-when-cross-origin` で外部遷移時のリファラを最小化
- `hidePoweredBy: true` で `X-Powered-By: Express` を消す（情報漏洩防止）
- `contentSecurityPolicy: false` — **API 側に CSP は不要**（API はブラウザに HTML を返さないため）。CSP は Web 側で設定

### Web 側の CSP 段階導入

CSP は強力な分、設定をミスるとサイト全体が壊れる。**2 段階で導入**:

1. `Content-Security-Policy-Report-Only` で運用開始（違反は通知だけ、ブロックしない）
2. 1〜2 週間レポートを観測して必要なドメインを追加
3. `Content-Security-Policy`（enforce モード）に切替

判断ポイント:

- **dev では CSP を一切送らない**（Next.js HMR が壊れるため）
- **production のみ Report-Only** で送出、staging は環境次第
- `unsafe-inline` `unsafe-eval` は **当面許可**（nonce ベース化は工数が大きく別フェーズ送り）
- `report-uri` は Sentry CSP ingestion を使う（自前 API を立てない）

### 参照ファイル

- `apps/api/src/main.ts`（CORS / Helmet）
- `apps/web/next.config.ts`（`headers()` + `buildCsp()`）

## 層2: XSS 二重防御

### 観点

`React` の `{value}` 補間は自動エスケープするので大半は安全。**危険なのは `dangerouslySetInnerHTML` と `<a href={user_input}>`**。

二重防御の設計:

| 層                    | ライブラリ      | タイミング              | 守るもの                             |
| --------------------- | --------------- | ----------------------- | ------------------------------------ |
| **A: バック入力時**   | `sanitize-html` | DB に保存する **前**    | これからの保存に永続防御             |
| **B: フロント出力時** | `DOMPurify`     | 画面に描画する **直前** | 既に DB に汚染データがあっても止める |

両方やる理由: 過去のデータ（既に保存済みの未サニタイズ HTML）への防御 + 将来 DB を直接編集された場合への防御。**片方が破られても、もう一方が止める**。

### サニタイズ方針

- **ホワイトリスト方式** — 許可タグ・属性を明示列挙、未知のものは除去
- 許可タグ: `<p> <br> <strong> <em> <h1〜4> <ul> <ol> <li> <a> <img> <table>` 等のテキスト装飾系
- 拒否タグ: `<script> <iframe> <object> <embed>` — リモートコード実行の入り口
- 拒否属性: `on*`（`onclick`, `onerror`）— インライン JS
- 拒否スキーム: `javascript:` `data:` — URL 経由の実行
- `<a>` には `rel="noopener noreferrer"` `target="_blank"` を **強制付与**（タブナビゲーション攻撃対策）

バック側とフロント側で **許可リストを揃える**（差異があると、片方で許可されて片方で除去される不可解な挙動になる）。

### 共通コンポーネント `<SafeHtml>`

各 `error.tsx` のように、`<SafeHtml>` は薄いラッパで、本体は `apps/web/components/safe-html.tsx`。`useMemo` で再描画時の再サニタイズを抑制している。**SSR 環境では動かない**ため `"use client"` 必須。

### スコープ外

- **リッチテキストエディタ（TipTap 等）** は別フェーズ送り。現状は `<Textarea>` に管理者が HTML を直書きする運用
- プレーンテキストフィールド（`BoardTopic.body` 等）は **React のエスケープで十分** なので追加対応なし

### 参照ファイル

- `apps/api/src/common/utils/html-sanitizer.ts`（バック側）
- `apps/api/src/common/utils/html-sanitizer.spec.ts`（13 ケース）
- `apps/web/components/safe-html.tsx`（フロント側）
- `apps/api/src/broadcasts/broadcasts.service.ts`（適用箇所）

## 層3: ファイルアップロード強化

### 観点

「**ファイル種別の偽装** をクライアント側のヒント（拡張子・Content-Type ヘッダ）に頼らずに検出する」のが目的。クライアントから来る情報はすべて疑う。

### Magic Number 検証

ファイルの先頭バイト列で実種別を判定。例えば JPEG なら必ず `FF D8 FF` で始まる。`.jpg` 拡張子を付けた `.exe` ファイルでも、先頭バイトを見れば `MZ`（PE バイナリ）だと判定できる → 拒否。

判定の3 段階:

1. file-type で実 MIME を検出
2. **カテゴリの許可リストに含まれているか**（avatar には image 系のみ等）
3. **宣言された Content-Type と一致するか**（拡張子偽装の最終チェック）

### 設計上の工夫: 検出関数の依存性注入

実装は `validateFileMagicWith(detect, ...)` と `validateFileMagic(...)` の 2 段階に分けてある:

```ts
// 内部実装（検出関数を inject 可能 → テスト容易）
export async function validateFileMagicWith(detect, buffer, mime, category);

// 公開 API（実 file-type を呼ぶ）
export async function validateFileMagic(buffer, mime, category) {
  const detect = await getDetector();
  return validateFileMagicWith(detect, buffer, mime, category);
}
```

理由: `file-type@21` は **ESM only** で Jest（CJS）から動的 import すると `--experimental-vm-modules` フラグが必要になる。判定ロジック側を独立した純粋関数にして、検出関数を mock 注入することで Jest 設定変更を回避。

### ファイル名サニタイザ

危険なパターンを **検出して例外で拒否**（自動的に取り除くと、ユーザーには何が起きたか分からない）。

拒否対象:

- `..` — パストラバーサル（`../../etc/passwd`）
- `\x00〜\x1f` — NULL バイト・制御文字（OS のファイルシステム混乱）
- `\\` `/` — パス区切り（`originalName` カラムに素のまま保存される経路の防御）
- 先頭 `.` — 隠しファイル
- 255 文字超過 — ファイルシステム制約

加えて Unicode NFC 正規化で半角/全角・合成済み/分解済みの偽装も統一する。

### スコープ外

- **ウイルススキャン**（ClamAV / Cloudflare Workers）は **Phase 12 のデプロイインフラ作業と一緒に対応**（インフラ側の負担が大きいため別フェーズ）
- **動画の Cloudflare Stream 直接アップロード経路** は既存実装を維持（API は 100MB のまま）

### 参照ファイル

- `apps/api/src/files/utils/file-magic-validator.ts`
- `apps/api/src/files/utils/file-magic-validator.spec.ts`（9 ケース、mock 注入）
- `apps/api/src/files/utils/filename-sanitizer.ts`
- `apps/api/src/files/utils/filename-sanitizer.spec.ts`（11 ケース）
- `apps/api/src/files/files.service.ts`（適用箇所）
- `apps/web/lib/upload/validate.ts`（フロント事前チェック）

## 層4: レートリミット 4 段防御

### 観点

DDoS / ブルートフォース / API 乱用 を、**異なる軸の 4 つの層で防ぐ**。1 つだけだと特定の攻撃パターンが素通りする。

| 層                    | 単位                | 例外シナリオで効くか                    |
| --------------------- | ------------------- | --------------------------------------- |
| A: グローバル IP 制限 | IP                  | 同一 IP 大量送信 ✅ / 分散攻撃 ❌       |
| B: 個別エンドポイント | IP × エンドポイント | 認証連打 ✅                             |
| C: アカウントロック   | ユーザー            | **複数 IP からの同一アカウント攻撃** ✅ |
| D: WebSocket          | 接続                | チャットスパム ✅                       |

**B と C は両方必要**。B（IP 単位 5/min）だけだとボットネットで複数 IP からアクセスされると素通り。C（アカウント単位 5 失敗で 15 分）と合わせて初めて分散攻撃も止まる。

### 閾値の判断

| 区分                 | 閾値            | 根拠                                             |
| -------------------- | --------------- | ------------------------------------------------ |
| 全 API 既定          | 60 req/min/IP   | 通常ユーザーが 1 秒に 1 回でも使えるくらいの余裕 |
| ログイン・PWリセット | 5 req/min/IP    | ブルートフォース防御の業界標準                   |
| ファイルアップロード | 10 req/min/IP   | 通常 1 ファイル/数秒で十分                       |
| アカウントロック     | 5 失敗で 15 分  | NIST のパスワード推奨と整合                      |
| WebSocket            | 30 msg/min/接続 | 通常会話の 5 倍程度の余裕                        |

### LoginAttemptService（C 層）の設計

DB ベース（`LoginHistory` テーブル）で実装。理由:

- 既に `LoginHistory` が成功/失敗を記録している → 流用できる
- 複数プロセス・サーバーで動かしても自動的に共有される
- ロック解除タイマーは「最古の失敗 + 15 分」で計算

メモリ実装にしなかった理由: 単一プロセス前提になり、将来のスケールで作り直しになる。Redis キャッシュも検討したが、Phase 11.4 では Redis ストレージは Phase 12 送り。

### WsRateLimiter（D 層）の設計

In-memory のトークンバケット。`socketId → タイムスタンプ配列[]` の Map で実装。**接続単位**なので IP 単位より効果が限定的だが、socket.io には @nestjs/throttler が直接適用できないので独自実装。

注意: `disconnect` で `cleanup()` を呼ばないとメモリリーク。

Phase 12 で複数インスタンス化するときは Redis ベースに置換する想定。

### 参照ファイル

- `apps/api/src/app.module.ts`（`ThrottlerModule.forRoot` + `APP_GUARD`）
- `apps/api/src/auth/auth.controller.ts`（`@Throttle({ strict })` 適用）
- `apps/api/src/files/files.controller.ts`（`@Throttle({ upload })` 適用）
- `apps/api/src/auth/services/login-attempt.service.ts`（C 層）
- `apps/api/src/auth/services/login-attempt.service.spec.ts`（6 ケース）
- `apps/api/src/chat/ws-rate-limiter.ts`（D 層）
- `apps/api/src/chat/ws-rate-limiter.spec.ts`（4 ケース）
- `apps/api/src/app.controller.ts`（`@SkipThrottle()` でヘルスチェック除外）

### Phase 11.3 との接続

ロック中の例外は **`BusinessException(ErrorCode.AUTH_ACCOUNT_LOCKED, 429, ...)`** で投げる。Phase 11.3 で確立した規約に従う。レートリミット超過時の 429 は `@nestjs/throttler` がデフォルトで `ThrottlerException` を投げるので、`AllExceptionsFilter` でステータスベースで `RATE_LIMIT_EXCEEDED` にマップされる。

## 層5: 依存脆弱性 + Secrets

### 観点

リリース前に脆弱性ゼロ状態にして、**今後の混入を CI で自動検知** する仕組みを整える。手動運用は続かない。

### 戦略

1. **直接依存**を更新（`package.json` の `^` 範囲外まで含む）
2. **間接依存**を `pnpm overrides` で強制更新
3. **親パッケージ**を更新して間接依存を巻き取れるか試す（こちらの方が綺麗）
4. CI で `pnpm audit --audit-level=high` を実行して再混入を防止
5. `gitleaks` で秘密情報の誤コミットを防止

### pnpm overrides の上限制約

`"picomatch@<4.0.4": "^4.0.4"` のような **上限制約付き override** にする理由:

- 内部依存の親パッケージが上がって自然に解決する場合に override が **自動的に効かなくなる**
- メンテナンス不要で「いつか勝手に消える」設計

### file-type advisory のメタ的問題

このプロジェクトで踏んだ罠: **`lodash` の advisory は patched: `>=4.18.0` だが、lodash 4.18 は存在しない**（メンテナが 4.x 系で新規リリースしない方針）。

解決: `node-emoji@1.x` 経由の lodash 依存だったので、`node-emoji@^2.2.0`（lodash 不要版）に override で巻き取り。

教訓: advisory の `patched_versions` が実在するか必ず npm registry で確認する。実在しない場合は **依存元の親パッケージを更新する** ルートを探す。

### gitleaks の二重配置

| 場所            | 方式                                                              |
| --------------- | ----------------------------------------------------------------- |
| pre-commit hook | ローカル `gitleaks` バイナリがあれば実行、無ければスキップ + 案内 |
| CI              | `gitleaks/gitleaks-action@v2` で必ず実行                          |

両方ある理由:

- pre-commit だけだと `--no-verify` で抜けられる
- CI だけだと一度 push してから検出 → push 履歴に残る（git filter-branch 等の面倒な対処が必要）

`.gitleaks.toml` の allowlist でデモシードのテスト用パスワード（`qaz1234`）を除外している。誤検知が増えたらここに追加する。

### 参照ファイル

- `package.json`（`pnpm.overrides`）
- `.github/workflows/ci.yml`（audit ジョブ + secrets-scan ジョブ）
- `.husky/pre-commit`（gitleaks 任意実行）
- `.gitleaks.toml`（allowlist）

## ライブラリ選定の根拠

| 用途                             | 採用                | 採用理由                                                   |
| -------------------------------- | ------------------- | ---------------------------------------------------------- |
| HTTP セキュリティヘッダー（API） | `helmet`            | Node.js でデファクト、デフォルト 11 種のヘッダーを一括適用 |
| HTML サニタイズ（バック）        | `sanitize-html`     | ホワイトリスト方式で安全側に倒しやすい、設定が読みやすい   |
| HTML サニタイズ（フロント）      | `DOMPurify`         | ブラウザの DOM API ベースで精度が高い、業界標準            |
| Magic Number 判定                | `file-type`         | 主要 100 種以上の MIME を判定、メンテナンスが活発          |
| レートリミット                   | `@nestjs/throttler` | NestJS 公式、デコレータベースで個別制御しやすい            |
| Secrets スキャン                 | `gitleaks`          | OSS、ルールが豊富、CI Action あり                          |

選定で迷わないこと: それぞれ事実上のデファクト。

## 標準から外れる選択（意識して採用したもの）

将来「なぜこうなっているのか」と疑問が出た時用の記録。

### 1. `file-type` を Function コンストラクタ経由で動的 import

`file-type@21` は ESM only。tsconfig の `moduleResolution` を変えるのは影響範囲が大きいので、`new Function("s", "return import(s)")` で TypeScript の解決をバイパスしている。実行時には Node.js が ESM を正しくロード。ESLint の `no-implied-eval` は明示的に disable。

### 2. テスト容易性のため検出関数を分離（`validateFileMagicWith`）

Jest が ESM 動的 import を扱えない問題への対処。判定ロジックを純粋関数化して、実 detector を inject する設計に変更。

### 3. WsRateLimiter は in-memory 実装

単一プロセス前提。Phase 12 の本番デプロイで複数インスタンス化するときに Redis ベースに置換する想定。今は YAGNI で in-memory のまま。

### 4. `eslint-config-next` を 16.2.2 にピン留め

16.2.4 で `react-hooks/set-state-in-effect` ルールが追加され、Phase 11.4 のスコープ外のコードが引っかかった。Phase 11.4 では「セキュリティ強化」だけに集中したいので一旦ピン留め。後日リファクタフェーズで解除。

## 新機能を実装する時の判断フロー

### バック新規エンドポイント

1. 認証必須なら `@UseGuards(JwtAuthGuard)`、ロール制限は `@Roles()`
2. 重い処理（メール送信・ログイン等）には `@Throttle({ strict })`
3. ファイル受け取りは `@Throttle({ upload })` + `validateFileMagic` + `sanitizeFilename`
4. HTML 入力（broadcast 等）は **必ず `sanitizeRichText()` を保存前に通す**
5. ヘルスチェック・CSP report 等は `@SkipThrottle()`

### フロント新規 UI

1. ユーザー入力 HTML を表示する箇所は **必ず `<SafeHtml>` を使う**（`dangerouslySetInnerHTML` 直書き禁止）
2. ユーザー由来の URL を `href` / `src` に流す場合、スキーム検証を入れる（http/https/mailto のみ許可）
3. ファイルアップロード UI は `validateFileBeforeUpload()` で事前チェック
4. 外部ドメインを fetch する場合、CSP の `connect-src` に追加する（`apps/web/next.config.ts` の `buildCsp()`）

### 依存追加

1. `pnpm add` 後に `pnpm audit` を確認
2. メジャーアップデートを伴う場合は **既存メジャー範囲内に留めるか** 判断
3. 新規 ErrorCode が必要なら `packages/shared/src/constants/error-codes.ts` に追加（Phase 11.3 規約）

## 関連ドキュメント

- 並列の品質基盤: `.claude/knowledge/error-handling-stack.md`（エラーハンドリング 4 層構成）
- プロジェクトの規約サマリ: `CLAUDE.md`
- セルフレビュー項目: `.claude/skills/review/SKILL.md` の「セキュリティチェック項目」セクション

## 履歴

- 2026-04-30: 初版（Phase 11.4 実装完了時）
