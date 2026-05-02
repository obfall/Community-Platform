# 11.5-07 UI 固定文字列の抽出と多言語化

## ゴール

- フロント全画面の日本語固定文字列を `messages/{locale}/*.json` に抽出する
- `useTranslations()` 経由で翻訳を呼ぶように全コンポーネントを書き換える
- date-fns の locale を動的化する
- Zod のエラーメッセージを一元化する

## 規模感（実地調査）

| 項目                             | 実数                  |
| -------------------------------- | --------------------- |
| Web の日本語含む .tsx            | 217 ファイル          |
| 日本語 grep ヒット行数（全 web） | 約 3,400 行           |
| Zod 日本語メッセージ直書き       | 43 箇所 / 14 ファイル |
| date-fns `import { ja }`         | 6 ファイル            |

**Phase 全体で最大ボリューム**。namespace 別に PR を分割し並列化することで現実的な工数に抑える。

## namespace 設計

`apps/web/messages/{locale}/{namespace}.json` の形で分割:

```
messages/
  ja/
    common.json          # ボタン・確認ダイアログ・トースト・空状態
    nav.json             # サイドバー・ヘッダー・パンくず
    auth.json            # login / register / password reset
    validation.json      # Zod customError 用
    errors.json          # API エラー（バック errors.json と key を共有）
    board.json           # 掲示板
    events.json          # イベント
    projects.json        # プロジェクト
    videos.json          # 動画
    chat.json            # チャット
    notifications.json   # 通知
    skills.json          # スキル
    shop.json            # ショップ
    albums.json          # アルバム
    venues.json          # 会場
    surveys.json         # アンケート
    contents.json        # コンテンツ
    faq.json             # FAQ
    settings.json        # 設定
    members.json         # メンバー管理
    moderation.json      # モデレーション
    memos.json           # メモ
    orientation.json     # オリエンテーション
    schedules.json       # スケジュール
    user-library.json    # ユーザーライブラリ
    analytics.json       # 分析
    broadcasts.json      # 一斉配信
    system-admin.json    # システム管理者
  en/
    （同じ namespace 構造）
```

next-intl では namespace を分けてもキーを `useTranslations("board")` の形で取れる。

## キー命名規則

```
{namespace}.{section}.{key}

例:
"common.actions.save"           = "保存" / "Save"
"common.actions.cancel"         = "キャンセル" / "Cancel"
"common.confirm.delete"         = "削除してよろしいですか？" / "Are you sure you want to delete?"
"board.topic.title"             = "トピック" / "Topic"
"board.topic.actions.create"    = "新しいトピックを作成" / "Create new topic"
"validation.required"           = "必須項目です" / "Required"
"validation.maxLength"          = "{max}文字以内で入力してください" / "Must be {max} characters or less"
```

ICU MessageFormat の引数名は **camelCase 統一**（`{userName}`, `{maxLength}`）。

## date-fns locale の動的化

`apps/web/lib/date-fns-locale.ts`（新規）:

```typescript
import { ja, enUS, type Locale as DateFnsLocale } from "date-fns/locale";

const map: Record<string, DateFnsLocale> = {
  ja,
  en: enUS,
};

export function getDateFnsLocale(locale: string): DateFnsLocale {
  return map[locale] ?? ja;
}
```

各コンポーネントで:

```tsx
"use client";
import { useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { getDateFnsLocale } from "@/lib/date-fns-locale";

export function NotificationItem({ createdAt }) {
  const locale = useLocale();
  return (
    <span>
      {formatDistanceToNow(createdAt, { addSuffix: true, locale: getDateFnsLocale(locale) })}
    </span>
  );
}
```

既存 6 ファイルの `import { ja } from "date-fns/locale"` を全置換。

## Zod 一元化

`apps/web/lib/zod-i18n-config.ts`（新規）:

```typescript
"use client";
import { z } from "zod/v4";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * クライアント側で使う zod 設定。Layout レベルで呼ぶ hook。
 */
export function useZodI18nConfig() {
  const t = useTranslations("validation");

  useEffect(() => {
    z.config({
      customError: (issue) => {
        switch (issue.code) {
          case "invalid_type":
            return t("invalid_type");
          case "too_small":
            if (issue.type === "string") return t("min_length", { min: issue.minimum });
            if (issue.type === "number") return t("min_number", { min: issue.minimum });
            return t("too_small");
          case "too_big":
            if (issue.type === "string") return t("max_length", { max: issue.maximum });
            return t("too_big");
          case "invalid_string":
            if (issue.validation === "email") return t("email");
            if (issue.validation === "url") return t("url");
            if (issue.validation === "regex") return t("invalid_format");
            return t("invalid_string");
          // ...
        }
        return undefined;
      },
    });
  }, [t]);
}
```

`apps/web/app/[locale]/layout.tsx` 内のクライアントコンポーネントから呼ぶ。

既存 43 箇所の `.email("メールアドレスを入力してください")` 等は **第二引数を削除** し customError に集約。

## 段階的抽出戦略

**1 PR = 1 namespace** が基本単位（domain ごと）。各 PR で:

1. `messages/ja/{ns}.json` と `messages/en/{ns}.json` のスケルトンを作成
2. 該当 feature の全 .tsx を grep で日本語抽出
3. キー定義 → JSON に追加 → コードで `useTranslations()` に置換
4. テスト・E2E に英語版の確認シナリオを追加（任意、優先度低）

### PR 分割（推奨順序）

| 優先度 | PR                                                                     | namespace                  | 規模感                       |
| ------ | ---------------------------------------------------------------------- | -------------------------- | ---------------------------- |
| 1      | common.json                                                            | 全画面共通ボタン・トースト | 中                           |
| 1      | nav.json                                                               | サイドバー・ヘッダー       | 小                           |
| 1      | validation.json + errors.json                                          | Zod / API エラー           | 中（43 箇所の Zod 一括対応） |
| 2      | auth.json                                                              | login / register           | 小                           |
| 2      | settings.json + members.json                                           | 設定全般                   | 中                           |
| 3      | board.json                                                             | 掲示板                     | 大                           |
| 3      | events.json                                                            | イベント                   | 大                           |
| 3      | projects.json                                                          | プロジェクト               | 大                           |
| 4      | videos.json + albums.json + contents.json                              | コンテンツ系               | 中                           |
| 4      | chat.json + notifications.json                                         | コミュニケーション         | 中                           |
| 4      | shop.json + skills.json                                                | コマース系                 | 中                           |
| 5      | surveys.json + faq.json + orientation.json                             | 情報系                     | 中                           |
| 5      | venues.json + spaces / schedules                                       | 場所系                     | 中                           |
| 5      | analytics.json + moderation.json + system-admin.json + broadcasts.json | 管理者系                   | 大                           |
| 5      | memos.json + user-library.json                                         | 個人系                     | 小                           |

合計 10〜20 PR。並列化可能（feature 別に開発者を割り当てる）。

## 抽出ツールの活用（任意）

[i18n-ally](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally) などの VSCode 拡張を入れると、選択範囲を自動でキー化・JSON 追記できる。`messages/ja/*.json` のフラット構造に対応。

## 触るファイル

- 新規: `apps/web/messages/{ja,en}/*.json`（約 25 namespace）
- 新規: `apps/web/lib/date-fns-locale.ts`
- 新規: `apps/web/lib/zod-i18n-config.ts`
- 編集: 各 feature のページ・コンポーネント・hooks（217 ファイル）
- 編集: 全 `import { ja } from "date-fns/locale"` 6 ファイル
- 編集: Zod 直書きメッセージ 43 箇所

## 完了条件（PR ごと）

- [ ] 該当 namespace の ja / en JSON が完備
- [ ] 該当 feature の画面が `/en/...` で英語表示される
- [ ] toast / dialog / form ラベル全てが翻訳済み
- [ ] 日付表示が locale-aware
- [ ] バリデエラーが locale-aware
- [ ] E2E が green

## Phase 全体の完了条件

- [ ] `apps/web/` 配下の grep で日本語固定文字列が許容される箇所のみ（コメント・テストデータ等）に限定される
- [ ] `/en/` でアプリ全体が英語表示される
- [ ] 言語追加（例: `ko`）が JSON ファイル追加 + locales テーブル INSERT のみで可能

## 工数

PR 10〜20 / 10〜20 日（並列化次第で短縮可能）

## メモ

- 「マスタデータ由来の文字列」（カテゴリ名等）は本 Phase ではなく 11.5-04 の責務
- 「UGC 由来の文字列」（投稿本文等）は本 Phase の対象外（11.5-05 の `originalLocale` 表示で完結）
- Email テンプレートの本文文字列は 11.5-06 の責務
