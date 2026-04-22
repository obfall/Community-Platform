# デザイン設定カスタマイズ リファクタ 実装計画

## 背景

`apps/web/app/(dashboard)/settings/community/` のデザイン設定タブ（`_components/design-settings-form.tsx`）はコミュニティのロゴ・ファビコン・色・フォントをカスタマイズする画面。レビューの結果、機能的なバグ・UX上の課題・コード品質の問題が複数見つかった。

本計画は、**ダークモードは非対応のまま**という前提で、ライトモード単一運用の中でデザインカスタマイズを健全化する。

## ゴール

1. **色変更で UI が壊れない**（foreground ペアの整合性確保）
2. **運営者が迷わない**（項目の階層化・説明文の整備）
3. **プレビューが実態と一致する**（アクセントは hover色として表現）
4. **コード品質を他フォームと揃える**（`react-hook-form` + `zod` パターンに統一）
5. **ダークモード非対応を明示**する（仕様として固定）

## スコープ

### In scope

| カテゴリ         | 内容                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| 機能             | foreground 色の自動計算（明度ベースで白/黒を決定）                   |
| 機能             | プレビューを実態（hover色等）に合わせた表現に変更                    |
| 機能             | 初期値（`DEFAULT_PRIMARY` 等）を `globals.css` と一致させる          |
| 機能             | フォント候補を実際に表示可能なものに絞る                             |
| 仕様             | ダークモード非対応の明示（`.dark` セレクタの扱いを確定）             |
| UX               | 設定項目を「基本 / 詳細」でアコーディオン化                          |
| UX               | 保存時の toast を 1 回に集約                                         |
| UX               | `window.confirm` → `AlertDialog`（shadcn）置換                       |
| UX               | text input / color input の value 整合性修正                         |
| コード品質       | `useState` 12 個 → `react-hook-form` + `zod`（他フォームと統一）     |
| コード品質       | 設定キーリストの定数化（`buildUpdates` と `handleReset` の重複解消） |
| アクセシビリティ | `<Label htmlFor>` / `<Input id>` の関連付け                          |

### Out of scope

- ダークモード対応（仕様として非対応を確定）
- マルチコミュニティ対応（現状の単一コミュニティ前提を維持）
- リアルタイムプレビュー（保存前の全体反映）
- バックエンドのバッチ更新 API 新設（フロント側での集約で対応）
- `AppSetting` テーブルの JSON 集約化（現行の key-value を維持）

## 現状調査

### 対象ファイル

| パス                                                                               | 内容                                                  |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `apps/web/app/(dashboard)/settings/community/_components/design-settings-form.tsx` | 設定フォーム本体（580行）                             |
| `apps/web/components/theme-applier.tsx`                                            | `app_settings` を読み取り `document` に適用           |
| `apps/web/app/globals.css`                                                         | Tailwind v4 の `@theme` で CSS 変数を定義（oklch 値） |
| `apps/web/hooks/settings/use-app-settings.ts`                                      | `useAppSettings` / `useUpdateAppSetting`              |
| `apps/api/src/settings/`                                                           | key-value 型の `app_settings` を返す API              |

### 扱われている設定キー（13個）

```
logo_url / favicon_url
primary_color / accent_color
header_bg_color / header_text_color
background_color / text_color
sidebar_bg_color / sidebar_text_color
sidebar_accent_color / sidebar_accent_text_color
font_family
```

### 主要な問題点

| #   | 問題                                                                                                   | ファイル:行                                                  |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 1   | primary / accent の foreground（文字色）が固定白のままで、薄い色を設定すると可読性崩壊                 | `globals.css:14,20`、`theme-applier.tsx:39-40`               |
| 2   | プレビューに「アクセントボタン」がありラベルと矛盾（accent は hover色）                                | `design-settings-form.tsx:557-563`                           |
| 3   | `DEFAULT_PRIMARY="#0a0a0a"` が `globals.css` の `oklch(0.205 0 0)`（≒`#343434`）と異なる               | `design-settings-form.tsx:20-21`                             |
| 4   | `.dark` セレクタが有効で OS のダークモードで自動切替が起きる可能性                                     | `globals.css:45-78`                                          |
| 5   | フォント候補にOS依存（游ゴシック / ヒラギノ）と Web配信必要（Noto）が混在、fallback で意図と異なる表示 | `design-settings-form.tsx:23-53`                             |
| 6   | 保存時に最大 13 個のキーで個別 mutation → `useUpdateAppSetting.onSuccess` で toast が 13 回出る        | `use-app-settings.ts:22`、`design-settings-form.tsx:144-147` |
| 7   | text input は空欄・color input は `#ffffff` を表示する不整合                                           | `design-settings-form.tsx:354-366` 等                        |
| 8   | `window.confirm` を使用（他では `AlertDialog` を使用）                                                 | `design-settings-form.tsx:155`                               |
| 9   | `useState` 12 個、`app-settings-form.tsx` は react-hook-form + zod                                     | `design-settings-form.tsx:59-74`                             |
| 10  | キーリストが `buildUpdates` と `handleReset` で重複                                                    | `design-settings-form.tsx:123-137, 175-189`                  |
| 11  | `<Label>` と `<Input>` が `htmlFor` / `id` で関連付けられていない                                      | `design-settings-form.tsx:全域`                              |

## 主要な決定事項

| #   | 決定                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- |
| 1   | ダークモードは **非対応**。`globals.css` の `.dark` セレクタは削除（`prefers-color-scheme` を無効化）      |
| 2   | foreground 色は **ユーザーが選んだ背景色の明度から自動計算**（白/黒で二値化）                              |
| 3   | 色の保存形式は `#RRGGBB`（HEX）で統一。`globals.css` の初期値も oklch → hex に変換して統一する             |
| 4   | フォントは **Web 配信に統一**（Google Fonts の Noto Sans JP / Noto Serif JP ＋ `system-ui` のみ）          |
| 5   | 保存ボタンは **単一 toast**。`useUpdateAppSetting` の `onSuccess` toast は抑制し、フォーム側で一括表示する |
| 6   | フォーム実装は **react-hook-form + zod** に移行（`app-settings-form.tsx` と統一）                          |
| 7   | 設定項目は **「基本」「詳細」** の 2 セクションにアコーディオンで整理                                      |

## 実装方針

### Phase 1: 軽微な修正と仕様確定（半日）

1. **フォント候補の絞り込み**
   - Google Fonts を `app/layout.tsx` で読み込み（Noto Sans JP / Noto Serif JP）
   - `FONT_OPTIONS` を以下に変更:
     - `system-ui`（デフォルト）
     - `'Noto Sans JP', sans-serif`（ゴシック）
     - `'Noto Serif JP', serif`（明朝）
   - 既存の保存値が選択肢にない場合のフォールバック処理（既存値 = 候補外なら Select の表示は「デフォルト」扱い）
2. **`DEFAULT_PRIMARY` / `DEFAULT_ACCENT` を `globals.css` と一致させる**
   - `globals.css` の oklch 値を HEX に変換して両ファイルで統一
3. **プレビューの「アクセントボタン」を hover 状態表現に変更**
   - プライマリーボタン（通常） / プライマリーボタン（hover時 = accent背景） / サイドバー項目（選択時 = accent）のプレビューに置き換え
4. **`window.confirm` を `AlertDialog` に置換**
5. **ダークモード非対応の明示**
   - `globals.css` の `.dark` セレクタ削除
   - `ThemeApplier` のコメント更新
6. **text input / color input の value 整合性修正**
   - `value={headerBgColor || "#ffffff"}` のように color input だけ fallback を持つパターンを廃止
   - 「未設定」状態を `checkbox` か `Button`（「デフォルトに戻す」）で明示

### Phase 2: UI/機能の改善（1〜2日）

1. **foreground 自動計算の導入**
   - ユーティリティ `lib/utils/color.ts` に `getContrastForeground(hex): "#000000" | "#ffffff"` を追加（WCAG 相対輝度で判定）
   - `ThemeApplier` で primary / accent / sidebar-accent の各 foreground を自動計算して適用
   - 保存項目からは `*-foreground` を除外（自動計算なので設定不要）
2. **設定項目のアコーディオン化**
   - shadcn `Accordion` を使用
   - 「基本」: ロゴ / ファビコン / プライマリー / 背景色 / 本文文字色 / フォント
   - 「詳細」: ヘッダー背景 / ヘッダー文字 / アクセント / サイドバー背景 / サイドバー文字 / サイドバー選択時背景
3. **保存時 toast の集約**
   - `useUpdateAppSetting` から `onSuccess` の toast を削除
   - 呼び出し側 (`handleSave`) で `Promise.all` の完了後に 1 回だけ表示
   - `app-settings-form.tsx` への影響も確認（同じ hook を使用）
4. **設定キーリストの定数化**
   - `const DESIGN_KEYS = [...] as const` を定義し `buildUpdates` / `handleReset` で共有

### Phase 3: コード品質とアクセシビリティ（1日）

1. **react-hook-form + zod への移行**
   - `appSettingsSchema` 相当の `designSettingsSchema` を定義
   - `useForm<DesignSettingsFormValues>({ resolver: zodResolver(...) })`
   - `useEffect` での初期化を `form.reset()` パターンに統一
2. **アクセシビリティ改善**
   - `<Label htmlFor="...">` + `<Input id="...">` のペアを全フィールドで徹底
   - color input の `aria-label` 明示

## 既存資産の利用可否

### 利用可（そのまま使用）

- `useAppSettings` / `useUpdateAppSetting` — API 呼び出し層
- `ThemeApplier` — CSS 変数適用（foreground 自動計算のロジックを追加するのみ）
- `AlertDialog` (`apps/web/components/ui/alert-dialog.tsx`) — confirm 置換
- `Accordion` (`apps/web/components/ui/accordion.tsx`) — 項目階層化
- `react-hook-form` + `zod` — `app-settings-form.tsx` と同じパターン
- `filesApi.upload` — ロゴ / ファビコンのアップロード

### 拡張が必要

- `useUpdateAppSetting` — `onSuccess` の toast 制御にオプション引数を追加、または toast 削除（呼び出し側で出す）
- `ThemeApplier` — foreground 自動計算ロジックの追加

### 新規作成

- `apps/web/lib/utils/color.ts` — 相対輝度・コントラスト判定ユーティリティ
- `designSettingsSchema`（`design-settings-form.tsx` 内 or `lib/schemas/` に切り出し）

## 影響範囲

### フロント

| ファイル                                                                           | 変更内容                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `apps/web/app/(dashboard)/settings/community/_components/design-settings-form.tsx` | 全面改修                                                                  |
| `apps/web/components/theme-applier.tsx`                                            | foreground 自動計算の追加                                                 |
| `apps/web/hooks/settings/use-app-settings.ts`                                      | `onSuccess` の toast 制御（app-settings-form.tsx にも影響するため要調整） |
| `apps/web/app/globals.css`                                                         | `.dark` セレクタ削除、oklch 値の見直し                                    |
| `apps/web/app/layout.tsx` (or `app/(dashboard)/layout.tsx`)                        | Google Fonts（Noto Sans JP / Serif JP）の読み込み追加                     |
| `apps/web/lib/utils/color.ts`（新規）                                              | 相対輝度ユーティリティ                                                    |

### バックエンド

- 変更なし（既存の `app_settings` key-value API をそのまま使用）

### DB

- マイグレーション不要
- 既存の保存値への影響:
  - `*-foreground` 系のキーは元々保存されていないため影響なし
  - `font_family` が新しい候補リストにない場合 → Select でデフォルト扱い（値は DB に残る）

### デザイントークン / CSS

- `globals.css` の `:root` 初期値は `design-settings-form.tsx` の `DEFAULT_*` と同一の HEX に揃える
- `.dark` セレクタ削除により、ブラウザの `prefers-color-scheme: dark` 設定でも色が変わらなくなる

## リスクと注意点

| #   | リスク                                                                  | 対策                                                                           |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | フォント候補を絞ったときに既存保存値が候補外になる                      | Select でフォールバック処理（表示は「デフォルト」、DB値は保持）                |
| 2   | foreground 自動計算が、意図したブランドガイドラインと合わない場合がある | 必要なら将来「手動設定」切替オプションを追加（今回は非対応）                   |
| 3   | `useUpdateAppSetting` の toast 削除は他画面（基本設定）にも影響         | `useUpdateAppSetting({ silent: true })` のようにオプション引数で制御可能にする |
| 4   | `.dark` 削除後、今後ダークモードが必要になった時の再実装コスト          | 非対応方針を README / コメントに明記し、後続で検討可能にしておく               |
| 5   | Google Fonts の読み込み遅延で初回描画時にフォントが切り替わる（FOUT）   | `next/font` の `display: "swap"` を使用してチラつきを最小化                    |

## マイルストーン

| Phase | 主要タスク                                                                                    | 工数目安 |
| ----- | --------------------------------------------------------------------------------------------- | -------- |
| 1     | フォント絞り込み / 初期値統一 / プレビュー修正 / AlertDialog / ダーク非対応確定 / input整合性 | 0.5 日   |
| 2     | foreground 自動計算 / アコーディオン化 / toast集約 / キー定数化                               | 1.5 日   |
| 3     | react-hook-form 移行 / アクセシビリティ                                                       | 1 日     |

合計: 約 3 日
