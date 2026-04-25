# Phase 11.4 セキュリティ強化 実装計画

## 目的

リリース前に既存のセキュリティ実装の穴を埋め、本番運用に耐える状態にする。`docs/リリース計画.md` で挙げられた 5 項目（CORS / Helmet / XSS / ファイルアップロード / レートリミット）に加え、調査で見つかった追加事項（CSP、依存脆弱性、ログイン試行制限）も対象に含める。

## スコープ

### 対象
- **層1**: HTTP セキュリティヘッダー強化（CORS 詳細化 + Helmet カスタム + CSP 導入）
- **層2**: XSS 対策（リッチテキストの入力サニタイズ + 出力時 DOMPurify）
- **層3**: ファイルアップロード強化（MIME magic number 検証、追加バリデーション、optional ウイルススキャン）
- **層4**: レートリミット（`@nestjs/throttler` 導入 + ログイン試行制限）
- **層5**: 依存脆弱性対応（`pnpm audit` 高/重大 5 件対応 + 中 13 件のうち重要なものを更新）

### 対象外（別フェーズ）
- リッチテキストエディタ（TipTap 等）の導入: 必要性が出たら別途検討、本計画では「現状の HTML 入力経路のサニタイズ」だけ対応
- Cookie ベース認証への切り替え（現在は JWT を JSON で返却）: 大きな設計変更なので別途
- ウイルススキャン（ClamAV）の本格導入: ストレージ前段に置くインフラ作業が大きいので Phase 12 で再検討
- ペネトレーションテスト・脆弱性診断（外部委託）

## 現状調査サマリ

### 実装済み（既存資産）
- `apps/api/src/main.ts`: `app.enableCors({ origin: process.env.CORS_ORIGIN, credentials: true })`、`app.use(helmet())`
- `apps/api/src/chat/chat.gateway.ts`: WebSocket 側も同じ CORS 環境変数を共有
- `apps/api/src/files/files.controller.ts`: multer の `fileSize` 100MB 制限
- `apps/api/src/files/files.service.ts`: MIME ホワイトリスト + sharp で画像再エンコード + UUID + 拡張子保存
- `apps/api/src/auth/`: JWT 15 分有効期限 + リフレッシュトークン rotation
- `apps/api/src/common/guards/roles.guard.ts` + `@Roles` デコレータ: **174 箇所** で RBAC 適用
- `apps/api/src/config/env.schema.ts`: Zod による環境変数の型安全
- Prisma 全使用、`$queryRaw` 使用なし → SQL インジェクション安全

### 未実装・不十分
- CORS の `methods` / `allowedHeaders` がデフォルト許可
- Helmet が完全デフォルト（CSP / カスタム HSTS なし）
- Next.js `next.config.ts` の `headers()` 設定なし（CSP / Permissions-Policy 等）
- リッチテキスト出力サニタイズなし（`apps/web/components/broadcasts/broadcast-detail.tsx` で `dangerouslySetInnerHTML` 使用、サニタイザなし）
- バックエンドで HTML 入力時のサニタイズなし（`broadcasts.service.ts` 等）
- レートリミット完全に未実装（`@nestjs/throttler` 等パッケージなし）
- ログイン試行制限なし（履歴は記録するが BAN しない）
- WebSocket レートリミットなし
- 依存脆弱性 18 件（高 5・中 13）

## 層別実装方針

詳細は個別ドキュメントを参照:

- [01-http-headers.md](./01-http-headers.md) — 層1: CORS 詳細化 + Helmet カスタム + CSP（API/Web 両側）
- [02-xss-sanitization.md](./02-xss-sanitization.md) — 層2: 入力時 sanitize-html + 出力時 DOMPurify
- [03-file-upload.md](./03-file-upload.md) — 層3: MIME magic number 検証 + ファイル名追加検査 + optional ウイルススキャン方針
- [04-rate-limiting.md](./04-rate-limiting.md) — 層4: `@nestjs/throttler` + ログイン試行制限（IP+メール ベース）
- [05-dependency-audit.md](./05-dependency-audit.md) — 層5: 脆弱性 18 件の対応方針 + secrets 再点検

## 実装順序・見積り

層 1〜5 は独立しているので並列着手可能。一人で進めるなら以下順序を推奨。

| 順 | 項目 | 内容 | 見積り |
|---|---|---|---|
| 1 | 層5 依存脆弱性 | パッチ更新 → npm audit クリーン化 | 0.5 日 |
| 2 | 層4 レートリミット | `@nestjs/throttler` 設定 + ログイン試行制限実装 + WebSocket 制限 | 0.5 日 |
| 3 | 層2 XSS サニタイズ | sanitize-html 導入 + DOMPurify 導入 + 既存箇所改修 | 0.5 日 |
| 4 | 層1 HTTP ヘッダー | Helmet カスタム + CSP 設計 + CORS 詳細化 | 1 日（CSP の動作確認に時間かかる） |
| 5 | 層3 ファイル強化 | magic number 検証、ファイル名検査強化 | 0.5 日 |

**合計見積り**: **3 日**（QA・本番反映確認含めて 3.5〜4 日）

## 横断的方針

### CSP の段階導入
CSP は **report-only モードで導入 → 違反レポートを集めて調整 → enforce モードに切替** の二段階で進める。一気に enforce すると本番の挙動が壊れやすい。

### レートリミット閾値の決め方
- 全エンドポイント既定: **60 req/min**（普通のユーザー操作には十分余裕）
- ログイン: **5 req/min**（ブルートフォース防御）
- ファイルアップロード: **10 req/min**
- 個別の例外は `@Throttle(...)` デコレータで設定

### 脆弱性対応の優先順位
- **高 5 件**: 即対応（軽微なバージョンアップで済むものから）
- **中 13 件**: メジャーバージョンアップを伴うものは破壊的変更を確認してから対応
- 自動更新 PR は Renovate / Dependabot 導入を後で検討

## 確定事項（2026-04-25 ユーザー承認済）

| # | 項目 | 決定 |
|---|---|---|
| Q1 | 動画ファイル受け取り | Cloudflare Stream に直アップロード、API は 100MB 維持 |
| Q2 | ファイルサイズ上限 | avatar 2MB / image 10MB / document 20MB |
| Q3 | ファイル種別偽装チェック | `file-type` で Magic Number 検証を入れる |
| Q4 | フロント側プレチェック | 導入する（UX 改善） |
| Q5 | ウイルススキャン | **Phase 12 送り** |
| Q6 | ログイン試行制限 | 5 回失敗で 15 分ロック |
| Q7 | ロック中の UX | 完全拒否 + 解除時刻表示（CAPTCHA は使わない） |
| Q8 | パスワードリセット制限 | 含める（5 回/分） |
| Q9 | Cookie 認証への切替 | **別フェーズ送り** |
| Q10 | API レートリミット既定 | 60 req/min/IP |
| Q11 | WebSocket レートリミット | 30 msg/min/接続 |
| Q12 | Redis ストレージ | **Phase 12 送り**（Phase 11.4 はメモリ） |
| Q13 | XSS サニタイズ層 | バックエンド + フロント の二重防御 |
| Q14 | テキスト系投稿のリッチ化 | プレーンテキスト維持（**別フェーズ送り**） |
| Q15 | CSP 導入方法 | Report-Only → enforce の段階導入 |
| Q16 | CSP report 送信先 | Sentry CSP ingestion |
| Q17 | CSP `unsafe-inline` | 当面許可（**nonce 化は別フェーズ送り**） |
| Q18 | CORS_ORIGIN | カンマ区切りで複数対応 |
| Q19 | 依存脆弱性対応範囲 | 18 件全部対応（高 5 + 中 13） |
| Q20 | 自動更新 bot | Dependabot 採用、ただし **導入は別フェーズ送り** |
| Q21 | 自動マージ範囲 | Dependabot 導入時に決定（別フェーズ） |
| Q22 | Secrets スキャン | gitleaks を **pre-commit + CI 両方** に導入 |
| Q23 | スコープ全体 | 5 層構成で確定 |
| Q24 | 全体見積り | 3.5〜4 日 |

## 別フェーズ送り項目（Phase 11.4 で対応しない）

リリース後 / Phase 12 / 必要時に検討する事項:

| 項目 | 想定フェーズ | 理由 |
|---|---|---|
| ウイルススキャン (ClamAV / R2 Workers) | **Phase 12** | デプロイ構成と一緒に検討 |
| Redis ベースのレート制限カウンタ | **Phase 12** | 複数サーバー化のタイミング |
| Cookie ベース認証への切替 + CSRF 対応 | **未定** | 大きな設計変更、現状 JWT in header で機能 |
| リッチテキストエディタ（TipTap 等）導入 | **未定** | ニーズ次第、現状の手動 HTML 編集で間に合う |
| Dependabot 自動更新の導入 | **未定** | Phase 11.4 では脆弱性 18 件を手動対応のみ |
| CSP の nonce ベース化（`unsafe-inline` 完全禁止） | **未定** | Next.js + Tailwind での nonce 化は工数大 |

これらは **「Phase 11.4 では対応しない」と明示的に決定** した項目。リリース後の TODO として管理する。

## 残確認事項

なし（全項目確定）

## 成果物

- `docs/plans/security-hardening/` 配下 6 ファイル（README + 各層詳細）
- Phase 11.4 実装着手時、このフォルダを基点にタスクを分解する
