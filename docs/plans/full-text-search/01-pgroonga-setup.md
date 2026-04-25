# 01: pgroonga セットアップ

## 目的

Supabase 開発・本番環境および CI 環境で pgroonga 拡張を有効化し、マイグレーションで管理可能にする。

## pgroonga とは

PostgreSQL の拡張機能の 1 つで、**Groonga**（Senna の後継、日本語形態素解析対応の検索エンジン）を PostgreSQL から使えるようにするもの。

主な特徴:

- 日本語の **形態素解析**（MeCab 同梱）で「東京都」を「東京」「都」に分割可
- 高速な全文検索演算子 `&@`（マッチ）/ `&@~`（クエリ構文）/ `&@*`（順序考慮）
- インデックス対応（`USING pgroonga`）
- スコア計算（`pgroonga_score`）でソート可能

## 現状調査

- `apps/api/prisma/migrations/00_baseline/migration.sql` に `CREATE EXTENSION pgroonga` なし
- Supabase ダッシュボード上で pgroonga 拡張の有効化状況は **要確認**
- CI（`.github/workflows/ci.yml`）の Postgres は標準 `postgres:16` イメージ → pgroonga 入っていない

## 実装ステップ

### ステップ1: Supabase で pgroonga 拡張を有効化

Supabase Dashboard で:

1. プロジェクト → Database → Extensions
2. `pgroonga` を検索
3. 「Enable」ボタンをクリック

または SQL Editor で:

```sql
CREATE EXTENSION IF NOT EXISTS pgroonga;
```

開発・本番両方で実行が必要。

### ステップ2: マイグレ追加（Prisma 管理外の SQL）

Prisma スキーマでは pgroonga 拡張を直接定義できないため、**カスタム SQL マイグレ** を作成:

```bash
cd apps/api
mkdir -p prisma/migrations/20260426000000_enable_pgroonga
```

`prisma/migrations/20260426000000_enable_pgroonga/migration.sql`:

```sql
-- pgroonga 拡張を有効化
-- Supabase 開発・本番でも事前にダッシュボードから有効化済みの想定
-- このマイグレは IF NOT EXISTS なので冪等
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- バージョン確認用コメント（情報取得は SELECT pgroonga_command('status') で）
COMMENT ON EXTENSION pgroonga IS 'Groonga based PostgreSQL extension for full-text search (Phase 11.1)';
```

このマイグレは index 作成より **必ず先** に走る必要がある。

### ステップ3: 開発環境 (ローカル + Docker) の対応

ローカルで開発・テストする際、PostgreSQL に pgroonga が入った Docker イメージを使う:

```bash
# ローカル開発・E2E テスト用
docker run -d --name community-pg \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=community \
  groonga/pgroonga:latest-alpine-17
```

`groonga/pgroonga:latest-alpine-17` には PostgreSQL 17 + pgroonga が同梱。

開発時は Supabase 開発 DB を使うので、ローカル Postgres は **E2E テストや pgroonga 動作確認時のみ** の用途。

### ステップ4: CI 環境の対応

`.github/workflows/ci.yml` の services を変更:

```yaml
services:
  postgres:
    image: groonga/pgroonga:latest-alpine-17 # postgres:16 から変更
    env:
      POSTGRES_PASSWORD: testpass
      POSTGRES_USER: testuser
      POSTGRES_DB: testdb
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

このイメージ変更は Phase 11.5 で立てた CI と整合する（11.5 の計画にも反映する）。

### ステップ5: 動作確認

マイグレ適用後、SQL で確認:

```sql
-- 拡張がインストールされているか
SELECT * FROM pg_extension WHERE extname = 'pgroonga';

-- pgroonga バージョン確認
SELECT pgroonga_command('status');

-- 簡易動作確認: テストテーブルでマッチ
CREATE TEMP TABLE search_test (id serial, content text);
INSERT INTO search_test (content) VALUES ('東京都の天気は晴れです'), ('大阪は雨です');
SELECT * FROM search_test WHERE content &@ '東京';
-- → 1 件返る（東京都の…が hit）
```

### ステップ6: Prisma との整合性

Prisma の `prisma db pull` / `prisma migrate dev` を実行すると、Prisma が認識できないインデックスは drop しようとすることがある。対策:

- `prisma/schema.prisma` の各モデルにコメントで pgroonga インデックスの存在を明記
- マイグレ運用は **`prisma migrate deploy` で適用、`prisma migrate dev` での自動生成は使わない**
- または Prisma の preview feature `extendedWhereUnique` 等の機能を確認

```prisma
model BoardTopic {
  // ...
  // @@index([title, body], type: Pgroonga) ← Prisma は対応していないため SQL で別途追加
  // pgroonga インデックスは migrations/{timestamp}_pgroonga_indexes/migration.sql で管理
}
```

### ステップ7: Supabase バックアップ・リストア時の注意

Supabase の自動バックアップから復元する場合、pgroonga インデックスも一緒に復元される（拡張が有効化されていれば）。リストア後の動作確認チェックリストに追加:

- 拡張有効化の確認
- インデックスの再構築有無確認

## 確定事項（2026-04-25）

- ✅ pgroonga 拡張を採用（Q1: A 確定）
- ✅ CI Postgres を `groonga/pgroonga:latest-alpine-17` に切替（Q8: A 確定、Phase 11.5 と整合）
- ✅ 普段は Supabase 開発 DB を使用、ローカル E2E のみ Docker pgroonga を使う想定

## 残確認事項

- [ ] Supabase Dashboard 上で pgroonga 拡張有効化を実施できるか（Pro プラン要件あれば実装着手時に判明、Free でもおそらく可）
- [ ] PostgreSQL 17 と Phase 11.0 baseline の互換性（実装着手時にテスト DB で検証）

## 成果物

- `apps/api/prisma/migrations/{timestamp}_enable_pgroonga/migration.sql`
- `.github/workflows/ci.yml`（services を `groonga/pgroonga` に変更）
- `docs/development.md` 等にローカル Docker 起動手順を追記（任意）
