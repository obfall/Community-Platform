# 外部サービスのセットアップ手順

ステージングデプロイのため、Railway / Supabase / Vercel / Cloudflare R2 / Sentry を設定する。
**実際にステージングを立ち上げた際の手順と、その過程で判明した注意点を反映した版。**

## 全体構成（実際に採用した形）

```
フロント : Vercel        → 1 プロジェクト, Production Branch = dev（= staging 扱い）
バック   : Railway       → 1 プロジェクト community-platform + Environment(staging, dev 追従)
DB       : Supabase      → 既存 1 プロジェクトを staging DB として使用（pgroonga 対応）
Redis    : （後回し）     → 無料枠で provision 不可。当面 Redis 無しで起動
ストレージ: Cloudflare R2 → 後回し可（未設定でも API 起動・閲覧系は動く）
監視     : Sentry        → 任意（DSN 未設定なら無効。後で追加可）
```

## 順序

```
1. Supabase   ← DB。pause していたら Resume。接続文字列を取得
2. Railway    ← API。Environment(staging) + 変数 + デプロイ + /health 確認
3. Vercel     ← Next.js。Root Directory=apps/web + NEXT_PUBLIC_API_URL + デプロイ
4. CORS 反映  ← Vercel URL を Railway CORS_ORIGIN に
5. R2 / Sentry ← 後回し可（アップロード/監視を使う段で追加）
```

---

## 1. Supabase（DB）

このアプリは全文検索で **pgroonga** を使うため、pgroonga 対応の Supabase を DB に使う
（Railway 標準 Postgres は pgroonga 非対応なので不可）。

### 1.1 プロジェクトの Resume（pause している場合）

無料プランは **7 日間アクセスが無いと自動 pause** される。pause 表示が出たら:

1. Supabase ダッシュボードで対象プロジェクトを開く
2. **「Resume project」/「Restore」** をクリック → 数分でオンラインに復帰

> ⚠ staging で使う以上、7 日無アクセスでまた pause される。常時必要なら Supabase Pro
> （$25/月）か keep-alive を検討。当面は「使う前に Resume」で無料運用。

### 1.2 接続文字列の取得

1. 上部の **「Connect」** ボタン（または Settings → Database → Connection string）
2. **Shared Pooler**（Supavisor, IPv4 対応）を使う。**Direct connection（`db.xxx.supabase.co`）は IPv6 既定で
   Railway から繋がらないことがあるので避ける**
3. モードを切り替えて 2 つ取得:

| Railway 変数   | Shared Pooler モード | ポート | 備考                   |
| -------------- | -------------------- | :----: | ---------------------- |
| `DATABASE_URL` | Transaction          |  6543  | 末尾 `?pgbouncer=true` |
| `DIRECT_URL`   | Session              |  5432  | マイグレ用             |

4. パスワードを忘れた場合 → **Settings → Database → Reset database password** で再発行
   （自動生成を選ぶと URL セーフ。記号入りを自分で設定すると URL エンコードが必要）

### 1.3 pgroonga 確認（任意）

**Database → Extensions** で `pgroonga` が有効化可能か確認。マイグレに
`CREATE EXTENSION IF NOT EXISTS pgroonga` が含まれるので通常は自動で有効化される。

### 本番化メモ

Supabase の **Branching は Pro 専用 + ブランチ毎課金**。無料で staging/production を分けるには
**別プロジェクトを作る**（production 用に 2 つ目を新規作成）のが基本。

---

## 2. Railway（API）

> **構成方針**: 1 プロジェクト `community-platform` 内で **Environment 機能**を使い
> staging / production を分離する（別プロジェクトにしない）。各 Environment は変数・サービス・
> 追従ブランチが独立する。
>
> ```
> プロジェクト: community-platform
> ├─ Environment: production → main 追従 → 本番DB（後で）
> └─ Environment: staging    → dev 追従  → Supabase / (R2 後で)   ← 今ここ
> ```

### 2.1 プロジェクト作成

1. <https://railway.com/> でアカウント作成（GitHub 認証）
2. **New Project** → **Deploy from GitHub repo** → `obfall/Community-Platform`
   （初回は GitHub App 認可が必要。private repo は対象リポジトリを明示的に許可）
3. プロジェクト名を `community-platform` に
4. **初回ビルドはほぼ失敗する**（モノレポ設定・env 未整備のため）。正常なので慌てない

### 2.2 staging Environment を追加

production はそのまま残し、staging を追加する:

1. 右上の Environment セレクタ → **Create / Duplicate Environment**
2. **Duplicate Environment**（base: production）を選ぶ → api サービス等の設定・変数が複製される
   （Empty を選ぶと全部手作業になる）
3. 以降の操作は **右上セレクタが `staging`** になっていることを必ず確認（production を触らないため）

> ⚠ Environment にサービスが無いと「The world is your playground」という空キャンバスが出る。
> その場合は **+ Create → GitHub Repo** でサービスを足すか、Duplicate からやり直す。

### 2.3 api サービスの設定

サービス（複製直後は名前が `Community-Platform`）をクリック → **Settings**:

- **Source → Branch = `dev`**（staging は dev 追従。production 環境は main のまま）
- **Build**:
  - **Builder = Railpack**（Railway の現行デフォルト。pnpm モノレポで OK。変更不要）
  - Build Command: `pnpm install --frozen-lockfile && pnpm --filter @community-platform/api... build`
  - Root Directory: 空欄（モノレポ root から）
- **Deploy**:
  - **Start Command**: `pnpm --filter @community-platform/api start:prod`
    （start:prod = `prisma migrate deploy && node dist/src/main`。**出力は `dist/src/main`**）
  - **Healthcheck Path**: `/health`
- サービス名を `api` にリネーム（任意）

### 2.4 Redis（後回し / 無料枠では provision 不可）

> ⚠ **Railway 無料プランは Redis を追加できない**（"Free plan resource provision limit exceeded"）。
> api サービスで枠を使い切るため。選択肢:
>
> - **Railway Hobby ($5/月)** にアップグレード → Redis 追加可
> - **外部 Redis（Upstash 等）** → BullMQ のコマンド制限に注意
> - **Redis 無しで運用**（当面これ）

**アプリは `REDIS_URL` ではなく `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` を読む**
（`app.module.ts` / `cache.service.ts` / `events.module.ts` が `REDIS_HOST` の有無で判定）。

- **`REDIS_HOST` を設定しない** → BullMQ はロードされず、キャッシュは No-op、起動はクリーン
- 影響: メール/ブロードキャスト配信（BullMQ）は動かない。ログイン・閲覧・チャット等は動く

Redis を足す時（Hobby 後）は Railway Redis の `REDISHOST`/`REDISPORT`/`REDISPASSWORD` を
`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` に参照設定する（`REDIS_URL` ではない）。

### 2.5 環境変数（staging / api サービス）

**Variables** タブで設定。最小構成は以下:

```env
# DB (Supabase Shared Pooler)
DATABASE_URL=<Transaction pooler 6543, ?pgbouncer=true>
DIRECT_URL=<Session pooler 5432>

# JWT (openssl rand -base64 48 を 2 回。dev とは別の値)
JWT_SECRET=<...>
JWT_REFRESH_SECRET=<...>

# App
NODE_ENV=production          # Swagger を使いたいなら未設定でも可
CORS_ORIGIN=https://placeholder.vercel.app   # Vercel デプロイ後に上書き
```

**設定しない / 削除するもの**:

- `PORT` → **設定しない**（Railway が自動注入。アプリは `process.env.PORT` を使う）
- `REDIS_HOST` → 設定しない（Redis 無し運用）。`REDIS_URL` はアプリが読まないので不要
- `S3_ENDPOINT` → 設定しない（設定すると MinIO モードになり R2 に繋がらない）
- **`POSTGRES_DB` / `POSTGRES_PASSWORD` / `POSTGRES_PORT` / `POSTGRES_USER`** → docker-compose 由来で
  Railway が自動検出して紛れ込むことがある。アプリは読まないので**削除**
- **`NEXT_PUBLIC_*`** → フロント専用。バックでは無視されるので**削除**

**後で足す（任意）**: `SENTRY_DSN` `SENTRY_ENVIRONMENT=staging` `RESEND_API_KEY`、R2 系 5 つ
（`CLOUDFLARE_ACCOUNT_ID` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_BUCKET_NAME` `R2_PUBLIC_URL`）。

### 2.6 デプロイ & 公開ドメイン

1. サービスが「There is no active deployment」なら **「Deploy the repo …」** をクリックして初回デプロイ
2. **Deployments → Build/Deploy Logs** で確認:
   - `prisma migrate deploy`（`No pending migrations` か `Applying 00_baseline`）
   - `Application running on port XXXX` / `Database connected`
3. **Settings → Networking → Generate Domain**（ポートを聞かれたらログの port 番号）
4. `https://<生成URL>/health` が **`{"status":"ok","services":{"database":"ok"}}`** を返せば成功

### Vercel に渡す値

```
NEXT_PUBLIC_API_URL=https://<railway>.up.railway.app/api    # 末尾 /api 必須
```

> `/api` は NestJS の global prefix（`main.ts` の `setGlobalPrefix("api", { exclude: ["/", "/health"] })`）。
> 全エンドポイントが `/api` 配下。`/health` だけ例外。フロントの baseURL に `/api` を含めないと 404。

---

## 3. Vercel（フロント）

### 3.1 インポート

1. <https://vercel.com/> → **Add New → Project → Import** → `obfall/Community-Platform`
2. **Root Directory = `apps/web`** ← **必須**（モノレポ）
3. Framework Preset: Next.js（自動検知）。Build/Install は自動でよい
4. Deploy（初回は default branch=main から走る。後で dev に切替）

### 3.2 Production Branch を dev に

> ⚠ Vercel は UI 改訂で **Production Branch を「Git」ではなく「Environments」に移動**した。

- **Settings → Environments → Production** → Branch Tracking を **`dev`** に変更

### 3.3 環境変数

- **Settings → Environment Variables** → Add:
  - `NEXT_PUBLIC_API_URL` = `https://<railway>/api`（**Production スコープ**。今 Production=dev=staging）
- Sentry 系（`NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`）は**任意**。後で可
- `API_PROXY_TARGET` は**設定しない**（β パターン = ブラウザから Railway 直接）

> `NEXT_PUBLIC_*` は**ビルド時に焼き込まれる**。変更後は**再ビルドが必要**（再起動では効かない）。

### 3.4 デプロイの起こし方（dev は保護ブランチ）

`dev` は branch protection（CI 必須）で**直接 push 不可**。Vercel の production(dev) デプロイは
**dev への PR マージで起きる**（マージ = dev への push がトリガー）。

- 通常運用: feature → dev の PR をマージ → Vercel staging が自動デプロイ
- 単発で起こしたい時: Vercel CLI `vercel --prod`、または小さな PR をマージ

### 3.5 デプロイ後: CORS 反映

1. 発行された Vercel URL（`https://xxx.vercel.app`）をコピー
2. Railway → staging / api → Variables → **`CORS_ORIGIN`** を Vercel URL で上書き
3. （R2 を使うなら）R2 CORS Policy の `https://*.vercel.app` を具体 URL に絞り込む

### 本番化メモ（Vercel）

- **Custom Environments（staging 環境を別名で作る）は Pro 専用**（プロジェクトの所属スコープが Pro である必要）。
  無料スコープでは作れない
- 無料で production を分けるなら **別 Vercel プロジェクト**（main 追従）を作る
- 「Production Checklist」（Custom Domain / Web Analytics / Speed Insights / Preview）は**全て任意・スキップ可**

---

## 4. Cloudflare R2（後回し可）

R2 未設定でも API は起動し、デモデータ（外部 URL）の閲覧系は動く。ファイルの
アップロード/ダウンロードを呼んだ時だけ 503。アップロードを試す段で追加すればよい。

### 4.1 セットアップ

1. Cloudflare アカウント → **R2 Object Storage** を有効化（無料枠 10GB / 月 100 万リクエスト）
2. **Create bucket**: `community-platform-staging`（APAC / Standard）
3. **Settings → Public Development URL → Allow Access** → 出る `https://pub-xxx.r2.dev` をメモ（`R2_PUBLIC_URL`）
4. **Settings → CORS Policy** に許可を追加（`https://*.vercel.app` 等）
5. **Manage R2 API Tokens → Create**（**Object Read & Write**、対象バケット限定）→ Access Key / Secret をメモ
6. **Account ID** をメモ

### 4.2 Railway に追加する変数

```env
CLOUDFLARE_ACCOUNT_ID=<...>
R2_ACCESS_KEY_ID=<...>
R2_SECRET_ACCESS_KEY=<...>
R2_BUCKET_NAME=community-platform-staging
R2_PUBLIC_URL=https://pub-xxxxxxxxxx.r2.dev
# S3_ENDPOINT は設定しない（R2 モードにするため）
```

> 容量の目安: アバター/画像は軽い（10GB に画像数万枚）。**動画が重い**（元ファイル + HLS の二重保存。
> 4K だと 1 本 3〜4GB）。本番で動画を多用するなら「変換後に元削除」「解像度上限」「Cloudflare Stream 分離」を検討。

---

## 5. Sentry（任意）

`SENTRY_DSN` 未設定なら Sentry は無効（起動に影響なし）。使う場合:

1. **Settings → Auth Tokens → Create**（scopes: `org:read` `project:read` `project:releases`）→ Vercel の `SENTRY_AUTH_TOKEN`
2. `community-api` の DSN → Railway `SENTRY_DSN`、`SENTRY_ENVIRONMENT=staging`
3. `community-web` の DSN → Vercel `NEXT_PUBLIC_SENTRY_DSN`、`NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging`
4. 環境タグ `staging` は最初のイベントで自動作成（事前作成不要）
5. Slack 通知連携は Phase 12 本番化と一緒に

---

## チェックリスト（実際の順）

- [ ] **1.1 Supabase を Resume**（pause している場合）
- [ ] **1.2 Shared Pooler の Transaction(6543)/Session(5432) を取得**（パスワード必要なら reset）
- [ ] **2.1 Railway プロジェクト `community-platform` 作成・GitHub 連携**
- [ ] **2.2 staging Environment を Duplicate で追加（dev 追従）**
- [ ] **2.3 api サービス: Branch=dev / Start=start:prod / Healthcheck=/health**
- [ ] **2.5 変数（DATABASE*URL / DIRECT_URL / JWT×2 / NODE_ENV / CORS placeholder）、POSTGRES*_・NEXT*PUBLIC*_ を削除**
- [ ] **2.6 初回デプロイ → Generate Domain → /health = {"status":"ok"}**
- [ ] **3.1 Vercel インポート（Root Directory=apps/web）**
- [ ] **3.2 Production Branch=dev（Settings→Environments→Production）**
- [ ] **3.3 NEXT_PUBLIC_API_URL = <railway>/api（Production スコープ）**
- [ ] **3.4 dev へ PR マージでデプロイ起こす**
- [ ] **3.5 Vercel URL を Railway CORS_ORIGIN に反映**
- [ ] **（後回し）R2 / Sentry / Redis(Hobby)**

---

## トラブルシューティング

### Railway: Redis を追加できない（resource provision limit）

無料プランの制約。Hobby($5/月) アップグレード、外部 Redis、または Redis 無し運用のいずれか。
アプリは `REDIS_HOST` 未設定なら Redis 無しで起動する。

### Railway: `Cannot find module 'dist/main'`

nest build は `dist/src/main` に出力する。Start Command は `node dist/src/main`（`start:prod` 修正済み）。

### Railway: `Cannot find module 'express'`

`import { Response } from "express"`（値 import）が `require("express")` になり pnpm strict で失敗。
型用途なら `import type` にする（修正済み）。

### Railway: 初回デプロイが「error deploying from source」

Build Logs の赤字を確認。Railpack はモノレポ pnpm を検出できるが、ダメなら Build/Install コマンドを明示。

### Railway → Supabase 接続 timeout / 繋がらない

Direct connection（IPv6）ではなく **Shared Pooler**（IPv4）を使う。`pgbouncer=true` を確認。

### Vercel: `Cannot find module '@community-platform/shared'`

`next.config.ts` の `transpilePackages: ["@community-platform/shared"]` を確認。Root Directory=apps/web を確認。

### Vercel: env を変えたのに反映されない

`NEXT_PUBLIC_*` はビルド時に焼き込まれる。**再ビルド（Redeploy / 新規デプロイ）**が必要。

### Vercel: dev に直接デプロイできない

dev は保護ブランチ。production(dev) デプロイは **dev への PR マージ**で起こす。

### R2 アップロードで 403

API トークンが Read のみの可能性 → Object Read & Write で再発行。

### CSP Report-Only の違反ログ

`next.config.ts` の `connect-src` に `https://*.up.railway.app` / `wss://*.up.railway.app` があるか確認（追加済み）。

---

## 次のステップ（デプロイ完了後）

1. Vercel URL にアクセスしてログイン画面が出るか
2. デモアカウント `sysadmin@test.com` / `qaz1234` でログイン
3. スモークテスト: ログイン → ホーム → 掲示板一覧 →（R2 を入れたら）画像アップロード
4. （Redis 無しなので）メール/ブロードキャスト配信は未検証であることを認識
5. 本番化フェーズ: production 環境（Railway）/ 別 Supabase・R2 プロジェクト / Redis(Hobby) / Sentry-Slack
