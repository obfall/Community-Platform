# Phase 11.5 多言語対応（i18n）実装計画

## ゴール

- UI（一般・管理画面の固定文字列）を **日本語 / 英語** で切替可能にする
- 管理者が登録するマスタデータ（カテゴリ・タグ・FAQ 等）を両言語で管理する
- ユーザー生成コンテンツ（UGC）は **投稿者の言語のまま保存・表示**（機械翻訳・翻訳ボタン機能はスコープ外）
- 通知（in-app / email / LINE）テンプレートを多言語化する
- URL prefix 方式（`/ja/...`, `/en/...`）でロケールを表現する
- 言語追加（`zh-Hant` 等）を将来コード変更なしで行える設計にする

## 確定済みの方針

| 領域 | 採用方針 |
|------|---------|
| フロント i18n | `next-intl` v4 |
| バック i18n | `nestjs-i18n` |
| 辞書フォーマット | JSON + ICU MessageFormat |
| URL 戦略 | `localePrefix: 'always'`（`/` は `/ja` へリダイレクト） |
| マスタ DB 戦略 | **翻訳テーブル分離**（`{table}_translations`） |
| UGC DB 戦略 | **`text` + `originalLocale` カラム**（JSONB は使わない、翻訳機能なし） |
| 言語決定優先順 | `User.preferredLocale` → cookie `NEXT_LOCALE` → `Accept-Language` → `appSettings.defaultLocale` |
| マスタ管理 UI | 言語タブ切替型（admin が両言語必須入力） |
| 翻訳機能（DeepL 等） | **実装しない** |
| 通知本番化（Resend / LINE） | 別 Phase（Phase 12）。本計画ではテンプレート多言語化のみ |

## Phase 一覧

| Phase | ドキュメント | 内容 | PR | 工数 |
|-------|-------------|------|----|------|
| 11.5-01 | [01-foundation.md](./01-foundation.md) | 基盤（locales テーブル、User.preferredLocale、shared 型） | 1〜2 | 1.5d |
| 11.5-02 | [02-routing.md](./02-routing.md) | フロント next-intl 導入と URL prefix 移行 | 1 | 2d |
| 11.5-03 | [03-backend-i18n.md](./03-backend-i18n.md) | バック nestjs-i18n + AllExceptionsFilter 統合 | 1 | 1.5d |
| 11.5-04 | [04-master-translations.md](./04-master-translations.md) | マスタ翻訳テーブル化と管理 UI | 8〜12 | 5〜7d |
| 11.5-05 | [05-ugc-original-locale.md](./05-ugc-original-locale.md) | UGC に originalLocale 追加 | 3〜5 | 2〜3d |
| 11.5-06 | [06-notifications.md](./06-notifications.md) | 通知系テンプレート多言語化 | 2〜3 | 2〜3d |
| 11.5-07 | [07-ui-strings.md](./07-ui-strings.md) | UI 固定文字列の抽出（最大ボリューム） | 10〜20 | 10〜20d |
| 11.5-08 | [08-cleanup.md](./08-cleanup.md) | 旧カラム削除・clean-up | 1 | 0.5d |

**合計: 27〜44 PR / 約 1〜1.5 ヶ月**（並列化前提）

## Phase 間の依存関係

```
11.5-01 (基盤)
   ├─→ 11.5-02 (フロント routing)
   │     └─→ 11.5-07 (UI 文字列抽出) ← 大ボリューム、namespace 別 PR で並列化
   ├─→ 11.5-03 (バック i18n)
   │     └─→ 11.5-06 (通知)
   ├─→ 11.5-04 (マスタ翻訳)
   └─→ 11.5-05 (UGC originalLocale)
                      └─→ 11.5-08 (cleanup) ← 全 Phase 完了後
```

11.5-04 と 11.5-05 は並行可能。11.5-07 は 11.5-02 完了後すぐ着手可能で、namespace 単位（feature 別）で複数 PR に分割して並列開発できる。

## Phase 11.1（全文検索）との関係

- **Phase 11.1 の pgroonga インデックス対象 15 テーブル**は本計画でも触る（UGC originalLocale 追加 + 翻訳テーブル化）
- 案A 採用により **pgroonga インデックスの貼り直しは不要**（UGC は単純 text のまま、`originalLocale` カラム追加のみで既存 index に影響なし）
- マスタ翻訳テーブル側で pgroonga 検索が必要な場合のみ、新テーブル `*_translations` に個別の pgroonga index を貼る

## 規模感（実地調査済み）

| 項目 | 実数 |
|------|------|
| Web 日本語含む .tsx | 217 ファイル / 約 3,400 行 |
| Zod 日本語メッセージ | 43 箇所 / 14 ファイル |
| API 標準 Exception throw | 267 箇所 / 43 ファイル |
| マスタ系翻訳対象テーブル | 約 25 |
| UGC 系 originalLocale 追加対象 | 約 20 |
| pgroonga 対象テーブル | 15（本計画では再構築不要） |
| E2E URL 参照 | 33 箇所 / 7 ファイル |

## 残るユーザー判断

1. **Phase 11.1 完了タイミング** — 11.5-04 / 05 着手前に 11.1 を fix させる前提。11.1 のリリース見込みのすり合わせが必要
2. **マスタ翻訳の初期 en データ** — 各マスタの英訳は誰が用意するか（admin 手作業 / 翻訳業者発注 / 暫定 placeholder）。本計画では **暫定 ja コピー** で出して admin が穴埋め前提
3. **UGC を他言語ユーザーが見る時の表示** — 「原文 (ja) のまま表示」「原文ラベルを付ける」「言語不一致を視覚的に示す」のどれにするか（11.5-05 で詳細設計）

## 関連規約

- `.claude/knowledge/error-handling-stack.md` — `AllExceptionsFilter` の改修（11.5-03）で順守
- `.claude/knowledge/security-hardening-stack.md` — `sanitizeRichText` を翻訳テーブル保存前に適用（11.5-04）
- `CLAUDE.md` — 新規テーブルには必ず RLS を有効化、マイグレーション順序は時系列順
