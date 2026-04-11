# CLAUDE.md

このファイルはプロジェクトの開発ルール・設計方針を記述する。Claude Code および開発者が参照する。

## コミット・ブランチ運用

- コミットメッセージは日本語（例: `feat: Phase 0.3 NestJS 初期化（...）`）
- 作業開始時に feature ブランチを作成（例: `feature/phase-1.2-auth`）
- git commit / git push は明示的な指示があるまで実行しない
- main ブランチにはコミット・push・マージを行わない
- 作業ブランチからのマージ先はすべて dev ブランチとする
- マージ完了後は dev ブランチに切り替える

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
