---
name: review
description: コードをプロジェクト規約に照らしてセルフレビューする。引数なしなら dev ブランチからの差分（現在のブランチで変更されたファイル）を対象に、引数指定時はそのパスを対象にする。3 つの専門エージェント（security-reviewer / code-quality-reviewer / test-reviewer）を並列 spawn し、結果を集約して docs/reviews/ に保存する。指摘のみを返し、修正は行わない。
argument-hint: "[file-or-directory-path（省略時は dev ブランチからの差分）]"
disable-model-invocation: true
context: fork
allowed-tools: Read, Grep, Glob, Write, Bash, Agent
---

# プロジェクト規約レビュー（オーケストレーター）

引数: `$ARGUMENTS`

このスキルは **3 つの専門エージェントを並列 spawn し、結果を集約する** オーケストレーター。各観点の詳細チェックリストはエージェントファイル側に集約されている（SSOT = Single Source of Truth）。

## レビュー対象の決定（最初に必ず実施）

引数 `$ARGUMENTS` の有無で対象を切り替える:

### 引数が空の場合（既定）

**現在のブランチで dev から変更されたファイル群** を対象とする。

```bash
# 変更ファイル一覧を取得
git fetch origin dev --quiet
git diff --name-only origin/dev...HEAD
```

- `origin/dev...HEAD` は「dev からブランチが分岐して以降に変更されたファイル」を返す
- 削除ファイルが含まれる場合は除外（レビュー対象は現存ファイルのみ）
- 0 件なら「dev からの差分がありません」と報告して終了
- リスト化したパスを各エージェントへ渡す（カンマ区切り or 改行区切り）

### 引数が指定されている場合

`$ARGUMENTS` をそのままレビュー対象パスとして扱う（ファイル単体・ディレクトリ・複数指定どちらも可）。

### scope-slug の決定

保存ファイル名用のスラグ:

- 引数なし → `branch-{現在のブランチ名のサフィックス}`（例: `branch-phase-11.4-security-hardening`）
- 引数指定 → 従来どおりパスから生成（`apps/api/src/board/` → `board`）

## 重要な原則

- **このスキルはコードを修正しない**。指摘事項を抽出するだけ。
- ユーザー自身が指摘事項を読み、**どれを直すか・直さないかを判断する**ためのツール。
- レビュー結果は必ず `docs/reviews/` に保存し、後で見返せるようにする。
- 指摘事項は **3 段階の優先度**（🔴 高 / 🟡 中 / 🟢 低）で分類する。

## 担当エージェント

| エージェント            | 担当領域                                                                                                                            | 定義ファイル                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `security-reviewer`     | セキュリティ 11 カテゴリ（HTTP ヘッダー / XSS / ファイル / レート / 依存 / 認証認可 / 機密ログ / SQL / データ整合性 / SSRF / CSRF） | `.claude/agents/security-reviewer.md`     |
| `code-quality-reviewer` | プロジェクト規約（フォルダ構成 / API 設計 / データアクセス / Phase 11.3 エラハン規約 / UI・フォーム・UX）                           | `.claude/agents/code-quality-reviewer.md` |
| `test-reviewer`         | テスト規約（spec の存在 / 命名 / 日本語化 / 粒度 / mock 戦略）                                                                      | `.claude/agents/test-reviewer.md`         |

## 実行手順

### ステップ 1: 3 エージェントを並列 spawn

「レビュー対象の決定」で得たパス群（引数 or dev 差分）を各エージェントに渡す。Agent ツールを **同一メッセージで 3 回**呼び出す（並列実行）:

```
Agent 1:
  subagent_type: "security-reviewer"
  description: "Security review of <対象>"
  prompt: |
    以下のファイル群をセキュリティ観点でレビューしてください:
    {改行区切りのファイルリスト or ディレクトリパス}

    対象は「現在のブランチで dev から変更されたファイル」または「ユーザー指定パス」です。
    変更されていないファイルでも、変更されたファイルから参照されている関連箇所は文脈確認のため読んで構いません。

Agent 2:
  subagent_type: "code-quality-reviewer"
  description: "Code quality review of <対象>"
  prompt: |
    以下のファイル群をコード品質観点（プロジェクト規約準拠）でレビューしてください:
    {同上}

Agent 3:
  subagent_type: "test-reviewer"
  description: "Test review of <対象>"
  prompt: |
    以下のファイル群をテスト観点でレビューしてください（テスト不在の検出も含む）:
    {同上}
```

3 つは独立しているので **必ず並列実行** する（直列だと遅い）。

### ステップ 2: 各エージェントの返答を統合

各エージェントは「セキュリティ」「コード品質」「テスト」のセクションごとに 🔴/🟡/🟢 + ファイルパス + 指摘 + 修正案を返す。これを以下の構造で 1 つのレポートに統合する:

- 各エージェントの指摘を **そのまま 1 セクション** として配置
- 全体サマリで合計件数を出す
- 良い点も各エージェントから引き継ぐ

### ステップ 3: docs/reviews/ に保存

`docs/reviews/{YYYY-MM-DD}-{scope-slug}.md` に保存する。

- **YYYY-MM-DD**: `date +%Y-%m-%d`
- **scope-slug**:
  - 引数なし（dev 差分） → `branch-{現在のブランチ名のサフィックス}`（例: ブランチが `feature/phase-11.4-security-hardening` なら `branch-phase-11.4-security-hardening`）
  - 引数指定 → 対象パスを短縮（`apps/api/src/board/` → `board`、`apps/web/app/(dashboard)/events/` → `events`）
- 同日同スコープは末尾に連番（`-2`, `-3`...）

### ステップ 4: 会話に短いサマリを返す

詳細はファイルに任せ、会話には以下を出力:

- 保存先パス
- 合計件数（高/中/低）
- 🔴 高優先のみ箇条書きで抜粋

## 保存ファイルのフォーマット

```markdown
---
date: 2026-04-30
scope: apps/api/src/board/
branch: feature/phase-11.4-security-hardening
reviewer: claude-code (/review)
agents: [security-reviewer, code-quality-reviewer, test-reviewer]
total_findings: 12
high: 3
medium: 6
low: 3
---

# レビュー結果: apps/api/src/board/

> ⚠ このレビューは **指摘のみ** で、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。

## サマリー

- 指摘事項: 12 件（🔴 高 3 / 🟡 中 6 / 🟢 低 3）
- セキュリティ: 4 件 / コード品質: 6 件 / テスト: 2 件

---

## セキュリティ (security-reviewer)

{security-reviewer の出力をそのまま貼り付け}

---

## コード品質 (code-quality-reviewer)

{code-quality-reviewer の出力をそのまま貼り付け}

---

## テスト (test-reviewer)

{test-reviewer の出力をそのまま貼り付け}

---

## 良い点（全エージェント集約）

- `apps/api/src/board/board.service.ts:120` — `$transaction` で atomic にしている（コード品質）
- `apps/api/src/board/board.controller.ts:35` — `@ApiResponse` で全ステータス定義（コード品質）
- ...

## 関連

- セキュリティ規約: `.claude/knowledge/security-hardening-stack.md`
- エラハン規約: `.claude/knowledge/error-handling-stack.md`
- 前回レビュー: `docs/reviews/{前日}-{scope}.md`（あれば）
```

## 優先度の定義（3 段階・全エージェント共通）

| マーク | 優先度 | 内容                                                       | 対応の目安                      |
| ------ | ------ | ---------------------------------------------------------- | ------------------------------- |
| 🔴     | **高** | セキュリティリスク・データ不整合・本番障害・規約の根本違反 | リリース前 / マージ前に修正必須 |
| 🟡     | **中** | 保守性・パフォーマンスへの中程度の影響、暫定運用は可       | 次のスプリント等で計画的に修正  |
| 🟢     | **低** | コード品質・スタイル・将来の改善候補                       | 余裕がある時 / 該当箇所を触る時 |

## 会話への出力（保存後の最終応答）

```markdown
✅ レビュー完了 — 保存先: `docs/reviews/2026-04-30-board.md`

### サマリー

- 指摘事項 12 件（🔴 高 3 / 🟡 中 6 / 🟢 低 3）
- 内訳: セキュリティ 4 / コード品質 6 / テスト 2
- 良い点 N 件

### 🔴 高優先（3 件） — リリース前必須対応

1. `board.controller.ts:18` — `@UseGuards(JwtAuthGuard)` 抜け（セキュリティ）
2. `board.service.ts:152` — レスポンスに `passwordHash` 漏洩リスク（セキュリティ）
3. `board.service.ts` — 対応 spec が存在しない（テスト）

詳細は保存ファイルを参照してください。

> ⚠ このレビューは指摘のみ。修正は自身で判断してください。
```

## 重要な原則（再掲）

1. **修正はしない**。3 エージェントの指摘をそのまま集約して保存する。
2. **規約変更は本ファイルではなく該当エージェントの md を更新**する（SSOT）。
3. **エージェント間の責務重複は許容**しない（重複指摘が出たら統合時に整理）。
4. 新観点を追加したい場合は新エージェントを `.claude/agents/` に追加し、本スキルの「担当エージェント」表に追記する。
