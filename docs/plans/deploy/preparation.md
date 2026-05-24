# デプロイ事前準備チェックリスト

ステージング環境（Vercel + Railway + デモ用 Supabase 流用）の構築前に確認・対応すべき項目を整理する。

## 前提となるステージング構成

リリース計画.md は Supabase 開発プロジェクト前提だが、現状の開発環境はローカル Docker（PostgreSQL + Redis + MinIO）に切り替わっている（`docker-compose.yml`）。したがってステージングは以下の構成を採用する:

| 役割     | サービス                                                  | 備考                                                    |
| -------- | --------------------------------------------------------- | ------------------------------------------------------- |
| フロント | **Vercel**（新規プロジェクト）                            | `apps/web` をホスト                                     |
| バック   | **Railway**（新規プロジェクト）                           | `apps/api` + Redis サービス                             |
| DB       | **Supabase 開発プロジェクト**（既存、デモ環境と共有）     | `docs/demo-environment.md` で使用中のプロジェクトを流用 |
| ファイル | **Cloudflare R2**（新規バケット、または開発用と共有）     | MinIO は使えないので R2 に切り替える                    |
| 監視     | **Sentry**（既存組織、`community-web` / `community-api`） | 環境タグで dev / staging を分離                         |

本番化（Phase 12 最終）時には Supabase 本番プロジェクトと R2 本番バケットを別途作成して切り替える。

---

## ① ビルド・起動設定

### 確認結果

| 項目                 | 設定値                                                     | デプロイ可否               |
| -------------------- | ---------------------------------------------------------- | -------------------------- |
| Node.js バージョン   | `>=22.0.0` (`package.json:engines`)                        | OK                         |
| パッケージマネージャ | `pnpm@9.15.9`                                              | OK                         |
| ビルドコマンド (api) | `pnpm build` = `nest build`                                | OK                         |
| 起動コマンド (api)   | `node dist/main`（`start:prod`）                           | OK                         |
| 起動ポート (api)     | `process.env.PORT \|\| 4000`（`apps/api/src/main.ts:108`） | Railway 互換 OK            |
| ビルドコマンド (web) | `pnpm build` = `next build`                                | OK                         |
| 起動コマンド (web)   | `next start`                                               | Vercel は不要              |
| Next.js output       | デフォルト（standalone 指定なし）                          | Vercel ではデフォルトで OK |
| postinstall hook     | `prisma generate` (`apps/api/package.json:17`)             | Railway ビルド OK          |
| Workspace transpile  | `transpilePackages: ["@community-platform/shared"]`        | OK                         |

### コード修正なし

すべてプラットフォーム互換。設定のみで進められる。

---

## ② 環境変数の整理

### バックエンド（Railway に設定）

`apps/api/src/config/env.schema.ts` で Zod 検証している項目を起点に整理:

#### 必須（未設定だと起動失敗）

| 変数                 | 内容                        | ステージング値       |
| -------------------- | --------------------------- | -------------------- |
| `DATABASE_URL`       | Supabase pooler URL (6543)  | 既存デモ用と同値     |
| `JWT_SECRET`         | 32 文字以上のランダム文字列 | dev とは別の新規生成 |
| `JWT_REFRESH_SECRET` | 32 文字以上のランダム文字列 | dev とは別の新規生成 |

#### 推奨（無くても起動するが、機能が制限される）

| 変数                 | 内容                                    | ステージング値                                |
| -------------------- | --------------------------------------- | --------------------------------------------- |
| `DIRECT_URL`         | Supabase direct URL (5432) — マイグレ用 | 既存デモ用と同値                              |
| `REDIS_URL`          | Railway Redis の内部 URL                | Railway が自動注入する `${{Redis.REDIS_URL}}` |
| `CORS_ORIGIN`        | Vercel のステージング URL               | `https://<staging>.vercel.app`                |
| `NODE_ENV`           | `production`                            | `production`                                  |
| `SENTRY_DSN`         | `community-api` プロジェクトの DSN      | 既存                                          |
| `SENTRY_ENVIRONMENT` | 環境タグ                                | `staging`                                     |
| `RESEND_API_KEY`     | メール配信                              | デモと同値 or staging 用に新規発行            |

#### R2（ファイルアップロード）

| 変数                    | 必須 | 備考                                            |
| ----------------------- | :--: | ----------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` |  ●   | R2 を使う場合                                   |
| `R2_ACCESS_KEY_ID`      |  ●   |                                                 |
| `R2_SECRET_ACCESS_KEY`  |  ●   |                                                 |
| `R2_BUCKET_NAME`        |      | デフォルト `community-files`                    |
| `R2_PUBLIC_URL`         |  ●   | カスタムドメインまたは `*.r2.dev` URL           |
| `S3_ENDPOINT`           |      | **設定しない**（設定すると MinIO モードになる） |

#### env.schema.ts に未登録だが起動時に参照される

調査の結果、Zod スキーマに無いが `process.env.XXX` で参照されている変数がある。**Zod 検証を通らないので無視されるだけで起動はするが、機能を使うなら追加が必要**:

| 変数                     | 用途                              | 対応                     |
| ------------------------ | --------------------------------- | ------------------------ |
| `SENTRY_ENVIRONMENT`     | `instrument.ts:26` で参照         | 設定推奨                 |
| `SENTRY_RELEASE`         | `instrument.ts:27` で参照         | Railway は自動代替あり\* |
| `RAILWAY_GIT_COMMIT_SHA` | Railway が自動注入する commit SHA | 自動                     |

> \*Railway はビルド時に `RAILWAY_GIT_COMMIT_SHA` を自動注入するので、`SENTRY_RELEASE` 明示設定は不要

### フロントエンド（Vercel に設定）

| 変数                             | スコープ      | 内容                                          | ステージング値                     |
| -------------------------------- | ------------- | --------------------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_API_URL`            | Production    | NestJS の URL（末尾 `/api`）                  | `https://<api>.up.railway.app/api` |
| `NEXT_PUBLIC_WS_URL`             | Production    | WebSocket URL（省略時は API_URL から導出）    | 省略可                             |
| `NEXT_PUBLIC_SENTRY_DSN`         | Production    | `community-web` プロジェクトの DSN            | 既存                               |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Production    | 環境タグ                                      | `staging`                          |
| `SENTRY_ORG`                     | Build         | Sentry org slug                               | 既存                               |
| `SENTRY_PROJECT`                 | Build         | `community-web`                               | 既存                               |
| `SENTRY_AUTH_TOKEN`              | Build         | ソースマップアップロード用                    | 既存                               |
| `API_PROXY_TARGET`               | Build/Runtime | rewrites 用（ステージングでは**設定しない**） | 未設定                             |
| `NEXT_PUBLIC_CSP_REPORT_URI`     | Production    | CSP 違反レポート送信先                        | 任意（Sentry の Report URI）       |

### コード修正なし

env.schema.ts の `DATABASE_URL` バリデーション (`startsWith("postgresql://")`) は Supabase URL と互換。

---

## ③ マイグレーション・初期データ戦略

### 現状

- マイグレーションファイル数: **30 個**（`apps/api/prisma/migrations/`）
- `prisma:migrate:deploy` スクリプトは定義済み（`apps/api/package.json:20`）
- seed は 2 種類:
  - `prisma/seed.ts` — Phase 1 基本データ（メンバーランク 3 + 機能設定 28）
  - `prisma/seed.demo.ts` — デモデータ（25 名のユーザー + 全ドメイン）

### Railway での自動マイグレ実行方法

Railway は 2 つの方法をサポート:

| 方法                       | 設定                                                           | 推奨度   |
| -------------------------- | -------------------------------------------------------------- | -------- |
| A. `start` スクリプト改修  | `"start:prod": "pnpm prisma:migrate:deploy && node dist/main"` | **推奨** |
| B. Railway Release Command | Railway ダッシュボードで `pnpm prisma:migrate:deploy` を設定   | 代替案   |

**A を推奨する理由**: コード（`package.json`）にマイグレ実行が含まれるので、Railway 以外のホスティングに移っても同じ動作になる。

### ステージング初期データ

デモ用 Supabase を流用するため、すでに以下が投入済み:

- ✅ Phase 1 基本データ（メンバーランク・機能設定）
- ✅ 25 名のデモユーザー + 全ドメインのデモデータ

**ステージング起動時に追加で seed を流す必要なし**。

### コード修正が必要

| ファイル                | 変更内容                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| `apps/api/package.json` | `"start:prod"` を `prisma migrate deploy && node dist/main` に変更 |

---

## ④ Sentry / セキュリティ設定

### CORS（バックエンド）

`apps/api/src/main.ts:40-51` で `CORS_ORIGIN` を読み込む実装は OK（カンマ区切り複数 origin 対応）。Vercel の URL を環境変数で設定するだけ。

### API 接続パターン: β（ブラウザから Railway 直接）を採用

検討した 2 案:

| 案                                                   | HTTP 経路                   | WebSocket 経路                         |
| ---------------------------------------------------- | --------------------------- | -------------------------------------- |
| α. Vercel rewrites で `/api/*` を Railway にプロキシ | ブラウザ → Vercel → Railway | Railway 直接（※rewrites は WS 非対応） |
| β. ブラウザから Railway を直接叩く                   | ブラウザ → Railway          | Railway 直接                           |

**β を採用する理由**:

1. **WebSocket は α でも β でも Railway 直接**になる（Vercel rewrites は WS Upgrade をプロキシしない）。したがって CSP の `wss://*.up.railway.app` 追加は α でも必須で、α の「CSP 修正不要」メリットは消える
2. **動画アップロード（最大 500MB）が α では通らない**:
   - Vercel Hobby/Pro: リクエストボディ 4.5MB 上限
   - Vercel Enterprise: 50MB 上限
   - `apps/web/next.config.ts:91` の `middlewareClientMaxBodySize: "500mb"` は Next.js 側設定で、Vercel インフラ層の制限はオーバーライドできない
3. **設定量・本番移行時の変更箇所が β の方が少ない**

### CSP 修正内容（β 採用に伴う）

`apps/web/next.config.ts:36-42` の `connect-src` に Railway ドメインを追加する必要がある:

```ts
"connect-src": [
  "'self'",
  "https://*.up.railway.app",       // ← 追加: HTTP API
  "wss://*.up.railway.app",         // ← 追加: WebSocket（チャット・通知）
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://*.sentry.io",
  "https://*.cloudflarestream.com",
],
```

CSP は Report-Only モード（`apps/web/next.config.ts:77-82`）なので未追加でも通信は止まらないが、違反ログが溜まる + 将来 enforce 化する際に追加忘れの事故になる。**ステージング着手と同タイミングで追加する**。

### CSP Report-Only モード

`apps/web/next.config.ts:77-82` で本番ビルドのみ Report-Only CSP を送信。**enforce 化は別途判断**（Phase 11.4 の方針通り、運用観測してから）。

### 認証方式（確認済み）

`apps/web/lib/auth.ts` を確認:

- アクセストークン・リフレッシュトークンは **localStorage** に保存
- API は `Authorization: Bearer <token>` ヘッダー（`apps/web/lib/api/client.ts:16`）
- Cookie は Next.js middleware が SSR 時に読むためのコピー（`SameSite=Lax`）で、認証通信には使われない
- WebSocket も `socket.io-client` の `auth: { token }` で Bearer 相当（`apps/web/app/(dashboard)/chat/page.tsx:87`）

→ **httpOnly Cookie ベースではない**ので、β（クロスオリジン）でも Cookie の `SameSite=None; Secure` などの調整は不要。CORS の `credentials: true` も実質的に preflight のためだけに残る。

### Sentry instrument

`apps/api/src/instrument.ts:23-65`:

- `SENTRY_DSN` が設定されているときのみ初期化（OK）
- `RAILWAY_GIT_COMMIT_SHA` を release タグに使う（OK）
- 4xx を除外、PII スクラブ済み（OK）

### コード修正が必要

| ファイル                  | 変更内容                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `apps/web/next.config.ts` | CSP `connect-src` に `https://*.up.railway.app` と `wss://*.up.railway.app` を追加 |

---

## ⑤ ファイルアップロード（MinIO → R2 切替）

### 確認結果

`apps/api/src/files/storage/storage.service.ts:18-47` を読むと、**S3_ENDPOINT が設定されているかどうかで MinIO / R2 を自動切替する設計**:

```ts
if (s3Endpoint && accessKeyId && secretAccessKey) {
  // MinIO モード
} else if (accountId && accessKeyId && secretAccessKey) {
  // R2 モード
}
```

→ Railway 側で `S3_ENDPOINT` を**設定しない**ことで R2 モードに切り替わる。

### Next.js Image 設定

`apps/web/next.config.ts:95-106` の `images.remotePatterns`:

- ✅ `*.r2.cloudflarestorage.com` 許可済み
- ✅ `*.cloudflarestream.com` 許可済み
- ⚠️ `R2_PUBLIC_URL` にカスタムドメインを使う場合は、そのドメインも追加が必要

### コード修正なし（カスタムドメイン未使用時）

R2 デフォルト URL（`*.r2.cloudflarestorage.com` または `*.r2.dev`）を使うなら設定のみ。

---

## まとめ：着手前 TODO

### 確定事項

- **構成**: Vercel（web）+ Railway（api + Redis）+ Supabase デモ用流用 + Cloudflare R2 新規
- **API 接続パターン**: β（ブラウザから Railway 直接）
- **CSP**: Report-Only モードのまま（enforce 化は別フェーズ）
- **トリガーブランチ**: `dev` → ステージングのみ自動デプロイ。`main` は未使用のまま残し、本番化は別フェーズで `main` → production トリガーを追加
- **デプロイ自動化方式**: Vercel/Railway の GitHub 標準連携。Required checks で CI 通過待ちを設定
- **ステージング DB**: Supabase デモ用プロジェクトを共有。デモ実施前に `db:reset:demo` を回す運用でカバー。共有起因の事故が増えたら staging プロジェクト分離（無料枠）に移行

### コード修正が必要なもの

| #   | ファイル                            | 変更内容                                                                           | 優先度 |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| 1   | `apps/api/package.json`             | `start:prod` に `pnpm prisma:migrate:deploy &&` を前置                             | **高** |
| 2   | `apps/web/next.config.ts`           | CSP `connect-src` に `https://*.up.railway.app` と `wss://*.up.railway.app` を追加 | **高** |
| 3   | `apps/api/src/config/env.schema.ts` | `SENTRY_ENVIRONMENT` などを Zod スキーマに追加（任意）                             | 低     |

### 外部サービス側の準備

| #   | サービス      | 内容                                                                                                          |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Cloudflare R2 | ステージング用バケット作成、API トークン発行、`R2_PUBLIC_URL` 取得（`*.r2.dev` 公開設定 or カスタムドメイン） |
| 2   | Sentry        | `community-web` / `community-api` プロジェクトに `staging` 環境タグの設定確認                                 |
| 3   | Vercel        | アカウント・GitHub リポジトリインポート、`apps/web` をルートに設定                                            |
| 4   | Railway       | アカウント・新規プロジェクト、`apps/api` をルート、Redis サービス追加                                         |

### 残る運用判断

なし。次のステップ（コード修正・外部サービスセットアップ）に進める状態。

### 運用上の注意（共有 DB に起因）

- ステージングで破壊的操作（大量データ削除など）を行う前にデモ実施予定を確認する
- デモ前に `pnpm db:reset:demo` を回すと **ステージングのデータも消える**
- 共有起因の事故が複数回起きたら、Supabase staging プロジェクト分離（無料枠で新規作成 → マイグレ + `db:seed:demo`）に切り替える

---

## 補足: 確認時に判明した懸念点

### `apps/api` の Prisma 接続

- `apps/api/src/main.ts` で `app.listen()` する前に Prisma の接続確認は行っていない
- Railway は起動失敗時にコンテナを再起動するので致命的ではないが、初回デプロイ時はログで `prisma migrate deploy` の成否を確認すること

### Vercel の middlewareClientMaxBodySize

`apps/web/next.config.ts:91` で 500MB に設定されているが、β 採用によりブラウザからのアップロードは Vercel を経由せず Railway 直接になるため、**この設定はステージング/本番では実質無効**（dev 環境の Cloudflare Quick Tunnel 経由デモ時にだけ効く）。

### 動画アップロード

`apps/api` 側で `MAX_VIDEO_UPLOAD_BYTES` は env.schema にも記載なし。`grep` で実装箇所を要確認（Phase 7 の動画機能を staging で試すなら）。

---

## 次のステップ

このチェックリストに沿って:

1. コード修正 2 件（#1 マイグレ自動実行、#2 CSP 追加）を feature ブランチで実装
2. 外部サービス（R2 → Vercel → Railway の順）をセットアップ
3. Vercel/Railway の GitHub 連携で **dev ブランチ** を対象にし、Required checks に CI を設定
4. 環境変数を全部入力して dev push で初回デプロイ実行
5. スモークテスト（ログイン・掲示板表示・画像アップロード）

各ステップで詰まったら個別に判断・修正する。
