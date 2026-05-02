# パフォーマンスベースライン

Phase 11.2 着手前の数値を記録する。改善後に同じ手順で再測定して Before/After を比較する。

## 計測手順

### バンドルサイズ

```powershell
# Windows (PowerShell)
$env:ANALYZE="true"; pnpm --filter @community-platform/web build
```

```bash
# macOS / Linux
ANALYZE=true pnpm --filter @community-platform/web build
```

ビルド完了後 `apps/web/.next/analyze/client.html` が自動でブラウザに開く（または手動で開く）。
treemap で重い依存を確認する。

`pnpm build` の標準出力末尾に出る Route ごとの `First Load JS` 表も記録対象。

### API レスポンス時間（pino スロークエリログ）

NestJS に `customSuccessMessage` を仕込んでおり、1 秒超のリクエストは
`slow request: METHOD URL` のメッセージで記録される。

ログ収集基盤（本番 Sentry / staging のログ集約先）で `slow request` を
キーワード検索すると、対象 URL の一覧が取れる。

### Lighthouse Score

main へマージ後 GitHub Actions の `Lighthouse CI` ワークフローが自動実行される。
artifact からレポート HTML を取得 or `temporary-public-storage` の URL から閲覧可。

手動実行も可:

```bash
gh workflow run lighthouse.yml
```

## ベースライン値

### 2026-05-02 (Phase 11.2 着手時、層1 整備直後)

#### 主要 chunk サイズ（webpack-bundle-analyzer / `apps/web/.next/static/chunks/`）

| Chunk            | Parsed |   Gzip | 主な依存                                            |
| ---------------- | -----: | -----: | --------------------------------------------------- |
| `a0c1906b-*.js`  | 504 KB | 156 KB | **hls.js** （`videos/[id]` の初期エントリーに含有） |
| `5291-*.js`      | 310 KB |  73 KB | Radix UI + @hookform/resolvers + Zod                |
| `framework-*.js` | 188 KB |      — | Next.js + React コア                                |
| `5672-*.js`      | 180 KB |      — | shared chunk                                        |

`apps/web/.next/static/chunks/` の合計は **5.3 MB**（uncompressed）。

#### Route First Load JS（重要ページ抜粋、`pnpm build` 出力より）

| Route                  |    Page | First Load JS | コメント                                              |
| ---------------------- | ------: | ------------: | ----------------------------------------------------- |
| `/videos/[id]`         |  169 kB |    **365 kB** | hls.js が初期含有。動的 import 化で大幅削減できる候補 |
| `/board`               |   574 B |        323 kB | リッチテキスト系？ 要 treemap 確認                    |
| `/events/[id]/board`   |   570 B |        323 kB | 〃                                                    |
| `/projects/[id]/board` |   572 B |        323 kB | 〃                                                    |
| `/board/topics/[id]`   |   531 B |        295 kB | 〃                                                    |
| `/settings/community`  | 19.6 kB |        282 kB | デザインカスタマイズ系                                |
| `/profile/edit`        | 14.1 kB |        281 kB | フォーム重め                                          |
| `/events/[id]/edit`    | 6.94 kB |        280 kB | フォーム重め                                          |
| `/events/new`          | 2.23 kB |        279 kB | 〃                                                    |
| `/chat`                | 22.1 kB |        219 kB | socket.io-client                                      |
| `/register`            | 6.63 kB |        242 kB | フォーム                                              |
| `/login`               | 5.83 kB |        230 kB | フォーム                                              |
| `Shared by all`        |       — |    **106 kB** | framework + 共通 chunk                                |

#### Lighthouse Score

| 項目                     | 値  | 備考                                        |
| ------------------------ | --- | ------------------------------------------- |
| Performance（ホーム）    | TBD | `lighthouse.yml` を main マージ後に初回実行 |
| Performance（/login）    | TBD | 〃                                          |
| Performance（/register） | TBD | 〃                                          |
| Accessibility            | TBD | 〃                                          |

#### バックエンド

| 項目                        | 値  | 備考                          |
| --------------------------- | --- | ----------------------------- |
| API P50 レスポンス時間      | TBD | 本番運用後 Sentry Performance |
| API P95 レスポンス時間      | TBD | 〃                            |
| pino slow request 件数 / 日 | TBD | 本番運用後ログ集約から取得    |

### Phase 11.2 着手時に発見した問題と対応

- **build 時 SSG タイムアウト**: `app/layout.tsx` の `generateMetadata` が
  `${apiUrl}/settings/app` を `next: { revalidate: 60 }` 付きで fetch しており、
  build 時 API 未起動環境で fetch が永遠に応答待ち → 60 秒で諦め → リトライ × 3
  → 失敗。19 ページが root layout を引き継ぐため全滅していた。
  → 対応済: `signal: AbortSignal.timeout(3000)` を追加し、3 秒で諦めて既存の
  `catch` でデフォルトメタデータを返すよう修正。これでビルド成功。

### 2026-MM-DD (Phase 11.2 完了後)

層2〜層5 を全て適用した後の値を記録（更新時に書く）。

## メモ

- スロークエリ閾値は 1 秒（`apps/api/src/app.module.ts` の `customSuccessMessage`）
- Lighthouse は main マージ時のみ自動実行（PR ごとは走らせない）
- バンドル分析は `ANALYZE=true` 時のみ有効（普段のビルドには影響なし）
