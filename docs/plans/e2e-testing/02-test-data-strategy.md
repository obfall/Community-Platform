# 02: テストデータ戦略

## 目的

E2E テスト実行時の **データの初期状態・分離・後始末** を設計する。既存の `db:reset:demo` を活用して再現性を確保。

## 現状調査

- `apps/api/prisma/demo/` でデモシード完備
- `pnpm db:reset:demo` でマイグレリセット + デモデータ投入が 1 コマンドで完結
- 25 ユーザー（admin / owner / member 各種 / suspended / withdrawn / visitor）
- 全ドメインのデモデータ（掲示板 40 / イベント 19 / 動画 15 等）

## 戦略

### 採用: スイート開始時に 1 回リセット + テスト間は累積

```
[ E2E スイート開始 ]
       ↓
  global-setup で db:reset:demo（≈30 秒）
       ↓
  test 1: yamada でログイン → 投稿作成
       ↓ （データ残る）
  test 2: suzuki でログイン → イベント申込
       ↓ （データ残る）
  test 3: ...
       ↓
[ E2E スイート終了 ]
       ↓
（次回スイート開始時にまた db:reset で クリーン化）
```

### この方針の根拠

- **シンプル**: テストごとに setup/teardown 不要
- **高速**: DB リセットは 30 秒、それを 1 回だけ
- **デモシードと統一**: 開発者が手動で動かす環境と同じデータ状態 → 再現しやすい
- **冪等性**: 各テストは「最低限自分の作る対象が無い」前提を持たない（あっても困らない設計に）

### テスト間の干渉回避

テスト同士が同じユーザー・同じデータをいじって干渉するのを避ける:

#### 方針1: ユーザーで分離（推奨）

| テスト       | ログインユーザー     |
| ------------ | -------------------- |
| 投稿作成     | `yamada@test.com`    |
| イベント申込 | `suzuki@test.com`    |
| チャット送信 | `takahashi@test.com` |
| 動画再生     | `ito@test.com`       |

→ 並列実行時も互いに干渉しない。

#### 方針2: 一意なテストデータ生成

新規作成系（投稿タイトル等）は **テスト固有の prefix** を付ける:

```ts
const testRunId = process.env.PLAYWRIGHT_TEST_RUN_ID ?? Date.now();
const topicTitle = `E2E[${testRunId}-${test.info().title}] テスト投稿`;
```

これで他のテスト・他のデモデータと混じらない。

#### 方針3: tag 付きクエリで自分の作ったものだけ操作

「自分が作った投稿だけ削除する」操作のテストでは、上記 prefix で作ったものだけを対象にする:

```ts
await page.getByRole("article").filter({ hasText: topicTitle }).first()...
```

## CI 環境のデータ分離

### 案A: 本番と同じ Supabase 開発プロジェクトを共有（避ける）

複数 PR が同時に走るとデータが混じる。

### 案B: PR ごとに別の Supabase プロジェクトを動的作成（過剰）

Supabase Branching を使えば可能。コスト・複雑性大。

### 案C: ローカルで Postgres を立てて使う（推奨）

GitHub Actions の services で Postgres コンテナを立てて、毎回そこに対して E2E を走らせる:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test
    ports:
      - 5432:5432
```

- 並列 PR が干渉しない（各 runner が独立した Postgres を持つ）
- Supabase 開発 DB に影響を与えない
- pgroonga 拡張が必要な場合は `groonga-image` を使うか pgroonga なしでテスト可能（要検討）

## 実装ステップ

### ステップ1: global-setup でリセット実行

`apps/web/e2e/global-setup.ts`（01 で作成済み）の中身:

```ts
import { execSync } from "node:child_process";

export default async function globalSetup() {
  if (process.env.SKIP_DB_RESET) {
    console.log("[global-setup] Skip DB reset (SKIP_DB_RESET set)");
    return;
  }
  console.log("[global-setup] Resetting demo database...");
  execSync("pnpm --filter @community-platform/api db:reset:demo", {
    stdio: "inherit",
    env: {
      ...process.env,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "playwright-e2e",
    },
  });
}
```

### ステップ2: テストユーザー定数

`apps/web/e2e/fixtures/test-users.ts`:

```ts
export const TEST_USERS = {
  sysadmin: { email: "sysadmin@test.com", password: "qaz1234" },
  ownerTanaka: { email: "tanaka.owner@test.com", password: "qaz1234" },
  ownerSato: { email: "sato.ops@test.com", password: "qaz1234" },
  memberYamada: { email: "yamada@test.com", password: "qaz1234" },
  memberSuzuki: { email: "suzuki@test.com", password: "qaz1234" },
  memberTakahashi: { email: "takahashi@test.com", password: "qaz1234" },
  memberIto: { email: "ito@test.com", password: "qaz1234" },
  memberWatanabe: { email: "watanabe@test.com", password: "qaz1234" },
  visitor: { email: "guest.visitor@test.com", password: "qaz1234" },
  suspended: { email: "abe.suspended@test.com", password: "qaz1234" },
  withdrawn: { email: "okada.withdrawn@test.com", password: "qaz1234" },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;
```

### ステップ3: テスト固有の識別子ヘルパー

`apps/web/e2e/helpers/test-id.ts`:

```ts
import type { TestInfo } from "@playwright/test";

export function uniqueLabel(testInfo: TestInfo, base: string): string {
  const safe = testInfo.title.replace(/[^\w]+/g, "_").slice(0, 20);
  return `E2E_${safe}_${Date.now()}_${base}`;
}
```

各テストで投稿タイトル等を `uniqueLabel(testInfo, "投稿テスト")` で生成。

### ステップ4: 高速化オプション（後で検討）

毎テストでデータをいじっていくとシードデータが汚れていく。**スイート全体で 5 分程度** に収まるなら現状の戦略で十分だが、超えるようなら:

- スイート開始時のリセットを **1 回 → 並列単位（worker ごと）** に分けて、別 schema or 別 DB に分離
- それぞれの worker が独立したデータ空間を持つ
- ただし複雑性増、現状不要

## 確定事項（2026-04-25）

- ✅ スイート開始時 `db:reset:demo` 1 回 + テスト間累積方式
- ✅ CI は GitHub Actions の Postgres 16 コンテナ（services）を使用
- ✅ **ローカル E2E 用に別 DB を推奨**（Supabase 開発 DB を消さないよう、Docker Postgres 等を別途用意）
- ✅ `apps/api/.env.test` で別 DB 接続を切り替え可能にする
- ✅ E2E 専用ユーザーを **新規 seeder** で追加（既存デモシードと分離、`apps/api/prisma/demo/seeders/09-e2e-users.ts` 等）

## ローカル DB 分離の実装方針

### `apps/api/.env.test`（新規）

```env
DATABASE_URL=postgresql://localhost:5432/community_e2e
DIRECT_URL=postgresql://localhost:5432/community_e2e
JWT_SECRET=test-only
# 他、最小限の必須環境変数
```

### 起動例

```bash
# Docker で空の Postgres を立てる（一度だけ）
docker run -d --name community-e2e-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=community_e2e \
  postgres:16

# E2E 実行（NODE_ENV=test で .env.test を読み込む設定にする）
NODE_ENV=test pnpm e2e
```

### グローバル setup の修正

`global-setup.ts` で「現在の DATABASE_URL が Supabase でないか」をチェック、もし Supabase なら警告を出して中断する安全装置を入れることも検討（**実装着手時に判断**）。

## E2E 専用ユーザー seeder の方針

`apps/api/prisma/demo/seeders/09-e2e-users.ts`:

- `e2e-admin@test.com` / `e2e-owner@test.com` / `e2e-member@test.com` の 3 名（Q12 と整合）
- パスワード `qaz1234`（既存デモユーザーと同じ）
- デモシード本体（25 名）に追加して投入
- 識別: メールアドレスの `e2e-` prefix で他のデモユーザーと区別可能

## pgroonga について

Phase 11.5 単体では pgroonga なしで動くテストに絞る方針（Phase 11.1 全文検索実装後に CI Postgres を `groonga/pgroonga` イメージに切替）。

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/web/e2e/global-setup.ts`（リセット実行）
- `apps/web/e2e/fixtures/test-users.ts`（ユーザー定数）
- `apps/web/e2e/helpers/test-id.ts`（一意 ID 生成）
- `.github/workflows/e2e.yml`（Postgres services 設定、05 で詳細）
