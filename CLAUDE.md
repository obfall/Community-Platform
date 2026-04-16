# CLAUDE.md

このファイルはプロジェクトの開発ルール・設計方針を記述する。Claude Code および開発者が参照する。

## コミット・ブランチ運用

- コミットメッセージは日本語（例: `feat: Phase 0.3 NestJS 初期化（...）`）
- 作業開始時に feature ブランチを作成（例: `feature/phase-1.2-auth`）
- git commit / git push は明示的な指示があるまで実行しない

## フォルダ構成 — Feature-based structure

ページ・hooks・API クライアント・バックエンドの4層を **同じドメイン名** で統一する。

```
app/(dashboard)/{feature}/         ← ページ
hooks/{feature}/use-{feature}.ts   ← hooks（ドメイン別サブディレクトリ）
lib/api/{feature}.ts               ← API クライアント
apps/api/src/{feature}/            ← NestJS モジュール
```

### 例: 新機能「recipes」を追加する場合

```
app/(dashboard)/recipes/           ← ページ群
hooks/recipes/use-recipes.ts       ← hooks
lib/api/recipes.ts                 ← API クライアント
apps/api/src/recipes/              ← NestJS モジュール
```

### ルール

- 命名に迷ったらページフォルダ名を基準にする
- settings 関連の hooks は `hooks/settings/` にまとめる
- ページ特有コンポーネントは `_components/` 配下に置く（Next.js のルーティング除外慣習）
- 共有コンポーネントは `apps/web/components/` に置く

## 実装方針

- **既存資産の再利用を優先する**: 自走で実装する際は、新しくコンポーネント・hooks・API クライアント・ユーティリティを作る前に、既存のもので実装できないか必ず確認する
  - UI: `apps/web/components/` および該当 feature の `_components/`
  - hooks: `hooks/{feature}/` および共通 hooks
  - API クライアント: `lib/api/`
- **既存の拡張・新規作成はユーザーに確認する**: そのまま使える既存資産が見つからなかった場合、実装に入る前に以下をユーザーに確認する
  - どの既存資産を拡張するか（候補とその拡張内容）
  - もしくは新規作成が必要な理由（既存では満たせない要件）
  - 確認を得てから実装に着手する

## 計画ドキュメント

**`/plan` スキルを使った場合のみ**、作成した計画をマークダウンファイルとして残す（通常の会話ベースの設計共有では作成不要）。

- 出力先: `docs/plans/{feature}/`
- `{feature}` は `app/(dashboard)/{feature}/` / `apps/api/src/{feature}/` と **同じドメイン名** に合わせる（フォルダ構成ルールと同じ基準）
- 共通機能や横断的な変更など既存ドメイン名に合わない場合は、内容がわかる柔軟な名前でフォルダを作成してよい
- ファイル名はスコープがわかるケバブケース（例: `owner-edit.md`, `photo-upload-on-create.md`）
- 記載内容: 背景・現状調査・実装方針・既存資産の利用可否・影響範囲
