---
name: e2e
description: Playwright E2E テストを起動前チェック込みで実行。Docker サービス起動・ポート競合解消・進捗モニタリング・結果サマリーまで一括。E2E テストを動かしたい時に使用。
argument-hint: "[ui|<spec-path>]"
disable-model-invocation: true
---

# E2E 実行

引数: `$ARGUMENTS`

## 引数の解釈

| 引数          | 動作                                                                              |
| ------------- | --------------------------------------------------------------------------------- |
| なし          | フル実行（build + DB reset + 全テスト）                                           |
| `ui`          | `pnpm e2e:ui` で UI モード起動（事前チェックのみ実施しモニタリングは行わない）    |
| `<spec-path>` | 特定テストのみ実行（例: `tests/auth/login.spec.ts`）。`pnpm e2e -- <path>` に渡す |

---

## 手順

### 1. 環境チェック（並列）

以下を並列で確認する:

- `docker compose ps` — postgres, redis, minio の起動確認
- `docker exec community-postgres psql -U postgres -lqt | cut -d '|' -f 1 | sed 's/ //g' | grep -E "community_e2e"` — E2E DB の存在確認
- `ls "C:/Users/81801/AppData/Local/ms-playwright/" | head` — Playwright ブラウザのインストール確認
- `netstat -ano | grep ":4000 " | grep LISTENING` — ポート 4000 確認
- `netstat -ano | grep ":3000 " | grep LISTENING` — ポート 3000 確認

### 2. 不足リソースのリカバリ

#### Redis / Postgres / MinIO のいずれかが落ちている場合

```bash
docker compose up -d redis postgres minio
```

起動完了まで `docker compose ps` で healthy を確認。

#### community_e2e DB が存在しない場合

ユーザーに「`community_e2e` DB が存在しません。作成しますか？」と確認の上で:

```bash
docker exec community-postgres psql -U postgres -c "CREATE DATABASE community_e2e;"
```

#### Playwright ブラウザが未インストールの場合

```bash
pnpm --filter @community-platform/web exec playwright install chromium
```

#### ポート 3000 / 4000 が占有されている場合

1. PID と CommandLine を取得して**ユーザーに表示**:
   ```bash
   powershell -Command "Get-CimInstance Win32_Process -Filter 'ProcessId={PID}' | Select-Object CommandLine | Format-List"
   ```
2. プロセスの正体を判定:
   - `apps/api/dist/main` や `next start` などの **stale な E2E 関連プロセス** → kill 提案
   - `next dev` や `pnpm dev` などの **明らかに開発中のプロセス** → ユーザーに「開発サーバーが動いています。停止してよいか？」と確認
3. ユーザーが OK したら `Stop-Process -Id {PID} -Force` で kill
4. `netstat` で再確認

### 3. テスト実行

#### `ui` 引数がある場合

```bash
pnpm --filter @community-platform/web e2e:ui
```

モニタリングはしない（インタラクティブモードのため）。起動を伝えて終了。

#### それ以外（通常実行）

バックグラウンドで `pnpm e2e` を起動する:

- 引数なし: `cd /path/to/repo && pnpm e2e`
- spec 指定: `cd /path/to/repo && pnpm e2e -- <spec-path>`

`run_in_background: true`、`timeout: 900000` で起動。

### 4. 進捗モニタリング

Monitor ツールでビルド〜テスト進捗を流す。grep フィルターは以下のキーワードを含めること:

```
global-setup|Compiled successfully|Ready in|Generating static pages|✓|✘|passed|failed|error|Error|FAIL|already used|Resetting|Generating|storageState|spec\.ts|Slow test|Compiling
```

主要マイルストーン:

1. `Creating an optimized production build` — ビルド開始
2. `Compiled successfully in Xs` — ビルド完了
3. `Generating static pages (X/Y)` — 静的生成
4. `Ready in Xs` — Web サーバー起動
5. `[global-setup] Resetting E2E database` — DB reset 開始
6. `[global-setup] storageState generated` — 認証状態準備完了
7. `Running N tests using 1 worker` — テスト開始
8. `✓` / `✘` — 個別テスト結果
9. `N passed (Xm)` — 完走

各マイルストーンを到達次第、ユーザーに 1 行で報告する（冗長な解説は不要）。

### 5. 結果報告

完走後、以下を報告する:

```
結果: X passed, Y failed (Zm)
```

#### 全 PASS の場合

実行時間を含めて簡潔に報告して終了。

#### 失敗がある場合

1. **失敗一覧** をテーブル形式で表示（テスト名、spec ファイル:行、エラー要約）
2. **次のアクションを提案**:
   - スクリーンショットとコンテキストの場所: `apps/web/e2e/test-results/{test-dir}/`
   - 失敗テストのデバッグ実行: `pnpm --filter web e2e:headed -- <spec-path>` または `e2e:debug`
3. **自動修正は行わない**。失敗の原因はテストコード／seed データ／プロダクトコードのいずれかなので、ユーザーの判断を待つ。

#### ビルド失敗の場合

build の TypeScript エラーや lint エラーを抜き出して表示。

---

## 注意事項

- **テスト実行中は他のターミナルで dev サーバーを起動しない**（ポート競合）
- **DB reset は `community_e2e` DB のみに対して行われる**（globalSetup の `assertNotProductionLike` で守られている）
- **失敗テストは `apps/web/e2e/test-results/` にスクリーンショット・トレース・動画が残る**ので削除せず参照する
- **API は postgres ロール直接接続で RLS をバイパスする**ため、E2E でも RLS の影響は受けない
