# 05: 依存脆弱性対応 + Secrets 再点検

## 目的

`pnpm audit` で検出された 18 件の脆弱性（高 5・中 13）を解消。併せて環境変数・秘密情報の取り扱いを再確認し、本番リリース前のクリーンな状態にする。

## 現状調査

### 既知の脆弱性（pnpm audit 概要）

**高 5 件**:

- `picomatch` — ReDoS（正規表現サービス拒否）→ `4.0.4` へ更新
- `path-to-regexp` — DoS → `8.4.0` へ更新
- 他 3 件（要 `pnpm audit --json` で詳細確認）

**中 13 件**:

- `axios` 1.14.0 → `1.15.0` 以上
- `fast-xml-parser` → `5.7.0` 以上
- `uuid` → `14.0.0` 以上
- 他 10 件

### Secrets 管理（実装済み）

- `apps/api/src/config/env.schema.ts`: Zod による環境変数バリデーション
- コード内ハードコード確認なし（grep 済）
- `.env` ファイルは `.gitignore` で管理（CLAUDE.md ルール）

### 不十分・要確認

- `.github/workflows/` で `pnpm audit --audit-level=high` を CI に組み込んでいるか
- Renovate / Dependabot 設定があるか
- 環境変数の **本番用のみ必須** 項目が staging で誤って必須にされていないか
- `.env.local.example` の記述が最新か

## 対応方針

### 段階1: 安全なパッチ更新（破壊的変更なし）

マイナー・パッチバージョンの更新で済むものを先に処理。

### 段階2: メジャー更新（破壊的変更あり）

変更履歴を確認しつつ、テストを通しながら 1 つずつ。

### 段階3: 自動更新の仕組み

Renovate / Dependabot を導入して継続的に最新化。

## 実装ステップ

### ステップ1: 詳細レポート取得

```bash
pnpm audit --json > /tmp/audit.json
```

JSON を解析して以下を一覧化:

- パッケージ名
- 現在バージョン / 推奨バージョン
- 重大度
- メジャー差分の有無
- 直接依存 / 間接依存

### ステップ2: パッチ更新（破壊的変更なし）

```bash
# 全 workspace で軽微な更新
pnpm update --recursive --interactive
```

interactive モードで安全な更新だけ選択。例えば:

- `axios` 1.14.0 → 1.15.0（マイナー）
- `picomatch` （devDependency 経由なので影響なし）
- `path-to-regexp`（多くの場合間接依存、`pnpm overrides` で固定）

### ステップ3: 間接依存の上書き（pnpm overrides）

`package.json` に追加:

```json
{
  "pnpm": {
    "overrides": {
      "picomatch@<4.0.4": ">=4.0.4",
      "path-to-regexp@<8.4.0": ">=8.4.0"
    }
  }
}
```

これで間接依存も強制更新される。

### ステップ4: メジャー更新（要慎重）

例: `uuid` v9 → v14 はメジャー差分あり（モジュール export 形式が変わる）

```bash
pnpm --filter @community-platform/api add uuid@latest
```

更新後、`uuid` を使っている箇所を grep して変更を反映。テスト実行で動作確認。

### ステップ5: 確認 + 再 audit

```bash
pnpm install
pnpm audit
```

残った高/重大が 0 になることを確認。0 にならない場合は:

- どうしても修正版が出てない依存 → `pnpm audit --ignore-scripts` で警告抑止 + コメントで理由記載
- 間接依存で更新が困難なら `overrides` で対応

### ステップ6: CI に audit を組み込み

`.github/workflows/ci.yml` に以下のジョブを追加:

```yaml
audit:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm audit --audit-level=high
```

`--audit-level=high` で **高/重大があれば失敗**、中以下は警告に留める。

### ステップ7: Renovate / Dependabot 導入

Renovate を採用する場合（Dependabot より柔軟）:

`renovate.json` をリポジトリ直下に配置:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "schedule": ["before 6am on Monday"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["dependencies", "major"]
    },
    {
      "matchPackagePatterns": ["^@nestjs/", "^next$", "^react$", "^prisma$"],
      "groupName": "framework major updates",
      "automerge": false
    }
  ],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "automerge": true
  }
}
```

GitHub の Renovate App をリポジトリで有効化（Dependabot より細かい制御可能）。

Dependabot 採用の場合は `.github/dependabot.yml` で同等設定。

### ステップ8: Secrets 再点検

#### .gitignore の確認

`.env*` 系がすべて含まれているか:

```
.env
.env.local
.env.*.local
```

#### 環境変数の整理

`apps/api/src/config/env.schema.ts` を見直し:

- 本番でしか使わない環境変数を `optional` にして dev/test で必須化されないように
- 不要になった環境変数を削除
- `.env.example` / `apps/web/.env.local.example` の記述を最新化

#### Secrets スキャナの導入（任意）

GitHub Secret Scanning は Public リポジトリで自動有効、Private リポジトリは GitHub Advanced Security 契約が必要。

代替:

- `gitleaks` を pre-commit hook に追加
- `trufflehog` を CI に追加

```bash
# pre-commit hook 例
pnpm add -D gitleaks
```

### ステップ9: 古いコメント・TODO の削除

ハードコードされたメールアドレス・URL・テスト用パスワード等を grep して削除（デモシードの `qaz1234` は除く）:

```bash
grep -rn "TODO\|FIXME\|XXX\|HACK" apps/ --include="*.ts" | head
grep -rn "password.*=.*['\"]" apps/ --include="*.ts" | head
```

## テスト方針

### 自動テスト

- 各依存更新後、`pnpm test` で全テスト pass を確認
- `pnpm build` でビルドエラーがないことを確認
- `pnpm lint` で型エラー・lint エラーがないことを確認

### 動作確認

- API 起動 / ヘルスチェック OK
- フロント起動 / ログイン OK
- 主要機能の手動スモークテスト（掲示板投稿・イベント申込・ファイルアップロード等）

## 確定事項（2026-04-25）

- ✅ **18 件全部対応**（高 5 件 + 中 13 件）
- ✅ CI の audit は `--audit-level=high` で失敗ルール追加
- ✅ Secrets スキャンは **gitleaks** を採用、**pre-commit + CI 両方** に導入（多重防御）
- ✅ **Dependabot 自動更新の導入は別フェーズ送り**（Phase 11.4 では脆弱性 18 件を手動対応のみ）
- ✅ Dependabot 採用方針は確定（Renovate ではなく Dependabot）。具体的な導入と自動マージ範囲は別フェーズで決定

## 残確認事項

- [ ] メジャーバージョンアップ（uuid v14 等）は Phase 11.4 内で実施 vs 別 PR で慎重対応（実装着手時にケースバイケースで判断）

## 成果物

- `package.json`（pnpm overrides 追加）
- 各 workspace の `package.json`（依存更新）
- `pnpm-lock.yaml`（更新）
- `.github/workflows/ci.yml`（audit ジョブ追加）
- `renovate.json` or `.github/dependabot.yml`
- `apps/api/src/config/env.schema.ts`（必要なら整理）
- `apps/web/.env.local.example`（最新化）
- `.gitleaks.toml`（任意）
