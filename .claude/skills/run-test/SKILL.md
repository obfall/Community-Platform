---
name: run-test
description: テストを実行して結果を報告。特定ファイル、モジュール、または全体のテストを実行する時に使用。
argument-hint: "[file-path|module-name|all]"
disable-model-invocation: true
---

# テスト実行

対象: `$ARGUMENTS`

## 実行パターンの判定

引数を解析して適切なコマンドを実行する。

### 1. `all` — 全パッケージのテスト実行

```bash
pnpm test
```

### 2. パッケージ名（`api` / `web` / `shared`）

```bash
pnpm --filter {package} test
```

### 3. モジュール名（`auth`, `board`, `event` 等）

バックエンドとフロントエンド両方のテストを実行:

```bash
pnpm --filter api test -- --testPathPattern="{module-name}/"
pnpm --filter web test -- {module-name}
```

### 4. ファイルパス指定

ファイルパスからパッケージを判定して実行:

- `apps/api/` 配下: `pnpm --filter api test -- --testPathPattern="{relative-path}"`
- `apps/web/` 配下: `pnpm --filter web test -- {relative-path}`
- `packages/shared/` 配下: `pnpm --filter shared test -- {relative-path}`

テストファイル自体が指定された場合はそのまま実行。
ソースファイルが指定された場合は対応する `__tests__/` ディレクトリのテストを探して実行。

---

## 結果報告

### 成功時

テスト結果のサマリーを簡潔に報告:

```
テスト結果: X passed, Y failed, Z skipped
```

### 失敗時

以下の手順で分析・報告:

1. **失敗テストの一覧表示**: テスト名とエラーメッセージ
2. **ソースコードの確認**: 失敗に関連するソースコードを読み取る
3. **原因分析**: エラーの原因を特定する
4. **修正案の提示**: 具体的なコード修正案を提示する（ただし自動修正はしない）

### カバレッジ

`--coverage` フラグが使える場合はカバレッジ情報も表示:

```bash
pnpm --filter {package} test -- --coverage --testPathPattern="{pattern}"
```

---

## 注意事項

- テスト実行前にビルドが必要な場合は先にビルドを実行する
- DB接続が必要なインテグレーションテストの場合は、テスト用DBの状態を確認する
- タイムアウトが発生する場合は `--testTimeout=10000` を追加して再実行する
