# 11.5-08 旧カラム削除・clean-up

## ゴール

- マスタテーブルに残した legacy カラム（旧 `name` / `description` 等）を削除する
- 各 feature の標準 Exception throw を順次 i18n キー化する
- 「日本語が残っている箇所」の最終チェックと修正

## 1. マスタ legacy カラムの削除

11.5-04 で `categories.name` / `description` 等を温存していた → translation テーブルに完全移行できたら削除。

判定:

- 全環境（dev / staging / prod）で `category_translations.locale = 'ja'` 行が `categories.name` と一致している
- アプリケーションコードで `categories.name` を直接読んでいる箇所がない（grep で確認）

マイグレーション例:

```sql
-- 20260601000001_drop_legacy_master_columns/migration.sql
ALTER TABLE categories
  DROP COLUMN name,
  DROP COLUMN description;

ALTER TABLE tags         DROP COLUMN name;
ALTER TABLE member_ranks DROP COLUMN name;
-- ...各テーブルを順次
```

Prisma schema からも legacy フィールドを削除。

## 2. 標準 Exception の i18n キー化

API 側の 267 箇所の `throw new NotFoundException("...")` 等を順次 `BusinessException(messageKey)` 形式に置換。

このタスクは 11.5-08 で**一気にやらない**。各 feature を別件で触る際に少しずつ移行する漸進アプローチを取る。本 Phase では「未移行リスト」のチェックのみ:

```bash
grep -rn 'throw new \(NotFoundException\|BadRequestException\|ConflictException\|ForbiddenException\)' apps/api/src --include='*.ts' | wc -l
```

を計測し、「あと N 箇所残っている」の進捗を docs に残す。

## 3. 日本語固定文字列の最終チェック

```bash
# フロント
rg --pcre2 '[\p{Han}\p{Hiragana}\p{Katakana}]' apps/web/app apps/web/components apps/web/hooks --type tsx --type ts \
  | grep -v -E '(test|spec|messages/ja)' \
  | wc -l
```

許容されるのはコメント・テストデータ・ja JSON ファイル等のみ。それ以外は 11.5-07 の取りこぼしとして該当 feature の追加 PR で潰す。

## 4. ESLint ルール追加

抜け漏れ防止のために:

`apps/web/eslint.config.mjs` にカスタムルール（例: [`eslint-plugin-i18next`](https://github.com/edvardchen/eslint-plugin-i18next)）追加:

```javascript
import i18next from "eslint-plugin-i18next";

export default [
  {
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "warn",
        {
          markupOnly: true,
          ignoreAttribute: ["data-testid", "className", "id"],
        },
      ],
    },
  },
];
```

`warn` で開始 → 件数が許容できるレベルになったら `error` に昇格。

`next/link`, `next/navigation` の Link / useRouter / redirect の直接 import を禁止する `no-restricted-imports` ルールを追加:

```javascript
{
  rules: {
    "no-restricted-imports": ["error", {
      paths: [
        { name: "next/link", message: "Use @/i18n/navigation Link instead" },
        { name: "next/navigation", importNames: ["useRouter", "redirect", "usePathname"], message: "Use @/i18n/navigation instead" },
      ],
    }],
  },
}
```

## 5. ドキュメント整備

- `.claude/knowledge/i18n-stack.md` を新設し、本計画の決定事項・各層の役割・新機能実装時の判断フローをまとめる
- `CLAUDE.md` の規約セクションに **i18n 規約** を追加し、この knowledge を参照させる
- `README.md` のセットアップ手順に locales seed と messages JSON の説明を追加

## 6. パフォーマンス確認

- `messages/{locale}/*.json` の合計サイズが過大でないか確認（300KB を超えるなら code-split or 動的 import 検討）
- 翻訳テーブル JOIN がボトルネックになっていないか N+1 確認
- pgroonga 検索の locale 対応が機能しているか確認

## 触るファイル

- 新規: `apps/api/prisma/migrations/20260601000001_drop_legacy_master_columns/migration.sql`
- 編集: `apps/api/prisma/schema.prisma`
- 編集: `apps/web/eslint.config.mjs`
- 新規: `.claude/knowledge/i18n-stack.md`
- 編集: `CLAUDE.md`
- 編集: `README.md`

## 完了条件

- [ ] マスタの legacy カラムが全削除されている
- [ ] アプリが green
- [ ] ESLint i18next ルールが warn / error で機能
- [ ] knowledge ドキュメントが整備
- [ ] 言語追加チュートリアル（`zh-Hant` を例）を `.claude/knowledge/i18n-stack.md` に記載

## 工数

PR 1 / 0.5 日（本格作業は他 Phase で消化済み、本 Phase は仕上げのみ）

## メモ

- API 標準 Exception 267 箇所のキー化は本 Phase で完遂しなくて OK。「進捗ダッシュボード」として残しておき、各 feature を触る際に漸進的に潰す
- UGC テーブルの `original_locale` カラムは削除しない（恒久的に必要）
- `Notification` の旧 `title` / `body` カラムは過去通知のレガシー表示維持のため恒久的に残す
