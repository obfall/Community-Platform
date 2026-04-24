# デモ環境セットアップ・運用手順

ローカルで動いている Community Platform を、顧客デモ用に一時的な HTTPS URL で公開するための手順書。

## 構成の全体像

```
[顧客ブラウザ]                         [開発者PC]
                                        ├─ NestJS API    :4000
                                        ├─ Next.js Web   :3000
  https://xxx.trycloudflare.com ──┐     │
         │                         ▼    │
         └────► Cloudflare エッジ ◄──── cloudflared (Quick Tunnel)
                                        │
                                        └─ Supabase（開発プロジェクト）
                                           ・117 テーブル
                                           ・25 名のデモユーザー
                                           ・全ドメイン充実したデモデータ
```

- **Cloudflare Quick Tunnel**: 認証なし・URL ランダム・セッション無制限の匿名トンネル
- **Next.js rewrites**: フロント → `/api/*` を NestJS に逆プロキシ（ブラウザは同一オリジン通信）
- **デモ DB**: Supabase 開発プロジェクト（`.env` の `DATABASE_URL`）

## 初回セットアップ（1 回だけ）

### 1. cloudflared のインストール

**PowerShell** で:

```powershell
winget install --id Cloudflare.cloudflared
```

別の手段:

- Scoop: `scoop install cloudflared`
- Chocolatey: `choco install cloudflared`
- 手動: https://github.com/cloudflare/cloudflared/releases の `cloudflared-windows-amd64.exe` を DL → 任意の場所に配置 → PATH を通す

インストール後、**新しいターミナル**で確認:

```bash
cloudflared --version
```

### 2. `apps/web/next.config.ts` の rewrites（実装済）

すでに以下の rewrites が仕込まれている（`API_PROXY_TARGET` 未設定時は無効）:

```ts
async rewrites() {
  const backend = process.env.API_PROXY_TARGET;
  if (!backend) return [];
  return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
},
```

### 3. `apps/web/.env.local` 作成

`apps/web/` 直下に `.env.local` を作成して以下を追加:

```env
NEXT_PUBLIC_API_URL=/api
API_PROXY_TARGET=http://localhost:4000
```

**注意**:

- 通常の開発（Tunnel を使わない dev）に戻すには、この 2 行を削除（またはファイルごと削除）すれば従来の `localhost:4000/api` 直叩きに戻る
- `API_PROXY_TARGET` は `NEXT_PUBLIC_` プレフィックスが無いのでブラウザには漏れない

### 4. デモデータ投入（初回のみ必要）

マイグレ適用 + デモデータ投入:

```bash
pnpm --filter @community-platform/api db:reset:demo
```

これで以下が実行される:

- `prisma migrate reset --force`（開発 DB を全消去 → `00_baseline` 再適用 → インフラシード）
- `ts-node prisma/seed.demo.ts`（25 名のデモユーザーほか全ドメインのデモデータ投入）

※ Prisma の AI ガードが発動する場合は `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=<任意> pnpm ...` で明示同意を付与する。

## デモ実施手順（毎回）

3 つのターミナルを使用する。

### ターミナル A: バックエンド

```bash
pnpm --filter @community-platform/api dev
```

`Nest application successfully started` が出て `http://localhost:4000` で待機状態になることを確認。

### ターミナル B: フロントエンド

```bash
pnpm --filter @community-platform/web dev
```

`Ready in X.Xs` が出て `http://localhost:3000` で待機状態になることを確認。

### ターミナル C: Cloudflare Tunnel

```bash
pnpm tunnel
```

起動すると以下のような URL が発行される:

```
+--------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:            |
|  https://xxxxx-yyyyy-zzzzz.trycloudflare.com                 |
+--------------------------------------------------------------+
```

この URL を顧客に共有する。

### 動作確認

- まずローカル（`http://localhost:3000`）にアクセスしてログイン画面が表示されることを確認
- 次に Tunnel URL にアクセスして同じ画面が表示されるか確認
- 別ネットワーク（スマホのモバイル回線など）からも Tunnel URL にアクセスできるか確認

## デモユーザー

全ユーザー共通パスワード: **`qaz1234`**

代表アカウント:

| ロール                       | メール                     | 名前           | 特徴                   |
| ---------------------------- | -------------------------- | -------------- | ---------------------- |
| システム管理者               | `sysadmin@test.com`        | システム管理者 | 全機能アクセス可       |
| コミュニティオーナー         | `tanaka.owner@test.com`    | 田中 太郎      | 運営管理者             |
| オーナー補佐                 | `sato.ops@test.com`        | 佐藤 花子      | サブ運営               |
| 一般会員（充実プロフィール） | `yamada@test.com`          | 山田 健一      | プロフィール完備       |
| 停止中会員                   | `abe.suspended@test.com`   | 安部 和也      | ログイン不可（検証用） |
| 退会済み会員                 | `okada.withdrawn@test.com` | 岡田 退会      | 退会フロー検証用       |
| ビジター                     | `guest.visitor@test.com`   | ゲスト 見学者  | 閲覧権限のみ           |

全 25 名の定義: `apps/api/prisma/demo/fixtures/users.ts`

## 含まれるデモデータ（参考）

| ドメイン                                                                     | 主要件数                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| ユーザー                                                                     | 25 名（admin 1 / owner 2 / member(active) 18 / member(suspended) 2 / member(withdrawn) 1 / visitor 1） |
| 掲示板                                                                       | 40 トピック / 170+ 投稿 / 800+ コメント / 600+ いいね                                                  |
| 通知                                                                         | 500+ 件（既読/未読ミックス）                                                                           |
| チャット                                                                     | 10 ルーム / 280+ メッセージ                                                                            |
| ブロードキャスト                                                             | 10 件（draft/scheduled/sending/sent/failed 各種）                                                      |
| イベント                                                                     | 19 件（draft/recruiting/closed/ended/canceled 各種）                                                   |
| プロジェクト                                                                 | 5 件（アクティブ/完了/アーカイブ）                                                                     |
| 動画                                                                         | 15 本 + 3 シリーズ / 視聴進捗 90+                                                                      |
| ポイント                                                                     | ルール 6 / 各ユーザー残高 / 履歴 220+                                                                  |
| アンケート                                                                   | 8 件（draft/active/closed 各種） / 回答 110+                                                           |
| スキル出品                                                                   | 10 件 / 予約 15 件                                                                                     |
| ショップ                                                                     | 商品 20 / 注文 15                                                                                      |
| アルバム                                                                     | 5 件 / 写真 47                                                                                         |
| 会場                                                                         | 3 件 / スペース 5 / 予約 15                                                                            |
| FAQ / メモ / スケジュール / モデレーション / オリエンテーション / ライブラリ | 各種                                                                                                   |
| アクティビティログ                                                           | 1,200+                                                                                                 |

## 停止手順（デモ終了後）

1. ターミナル C（tunnel）で `Ctrl+C` → URL が失効
2. ターミナル A, B も `Ctrl+C` で停止（必要に応じて）

**重要**: Quick Tunnel は認証なしで URL を知っている人なら誰でもアクセスできる。**デモ終了後は必ず Tunnel を停止** すること。

## デモデータの再投入（必要に応じて）

デモ中にデータが変更された / 汚れた場合、再度クリーンな状態に戻すには:

```bash
pnpm --filter @community-platform/api db:reset:demo
```

※ 開発 DB の全データが消えて再投入される。

データの追加だけなら（既存を残したまま）:

```bash
pnpm --filter @community-platform/api db:seed:demo
```

※ デモデータ（`@test.com` ユーザー + 関連データ）のみを削除 → 再投入（冪等）。

## トラブルシューティング

### `cloudflared` が認識されない

```
'cloudflared' は、内部コマンドまたは外部コマンドとして認識されていません
```

- インストール直後は **新しいターミナル** を開く必要がある（既存ターミナルには PATH が反映されない）
- winget インストールが失敗した場合は直接ダウンロード方式に切り替える

### `ERR Cannot determine default origin certificate path`

Quick Tunnel では不要な Named Tunnel 用の警告。**無視して OK**。後続の `Registered tunnel connection` が出ていれば成功。

### Tunnel URL にアクセスしても白画面 or API エラー

- `apps/web/.env.local` の 2 行が設定されているか確認
- ターミナル A（NestJS）が `localhost:4000` で起動しているか確認
- ブラウザ DevTools の Network タブで API リクエストが `/api/xxx`（相対）になっているか確認（`http://localhost:4000/api/xxx` になっていたら `.env.local` が読めていない）

### "Incoming request ended abruptly: context canceled"

ブラウザ側で接続を切った時に出る。主な原因:

- Next.js の dev コンパイルが遅くてブラウザがタイムアウト → **初回アクセスは 10〜30 秒待つ**（リロード連打しない）
- リロード連打で毎回コンパイルやり直し → URL を開いたらそのまま待つ
- Next.js 側でエラー → ターミナル B のログで詳細確認

### デモ中に R2 / Resend 等のキーを消費したくない

デモ公開中は顧客操作で実際のアップロード・送信が発生する可能性あり。必要に応じて:

- R2 キーを read-only / sandbox バケット用に差し替え
- Resend を送信先ドメイン制限付きキーに差し替え
- `.env` を一時的に差し替えて起動

### デモ URL を固定したい / 認証をかけたい

Quick Tunnel の仕様上 URL は毎回変わり、認証もかからない。以下のいずれかに移行する:

- **Named Tunnel + Cloudflare Access**: 独自ドメイン + Google OAuth 等
- **Tailscale Funnel**: 既に Tailscale を使っている場合

どちらも Cloudflare / Tailscale のアカウントと追加設定が必要。

## 参考リンク

- [Cloudflare Quick Tunnel 公式](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)
- [Cloudflare Named Tunnel 公式](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps)
- デモデータ実装: `apps/api/prisma/demo/`
- マイグレ baseline: `apps/api/prisma/migrations/00_baseline/`
