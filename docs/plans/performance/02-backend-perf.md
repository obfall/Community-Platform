# 02: バックエンド DB 最適化

## 目的

Prisma のクエリパターンを見直し、スロークエリ・N+1 問題・冗長なフィールド転送を解消する。

## 現状調査

### 良い点

- ✅ `Promise.all([findMany, count])` で件数取得との二重実行を回避
- ✅ `include` の動的化（scope 別）で不要 JOIN を抑制
- ✅ `prisma.$queryRaw` の使用なし（Phase 11.1 後は pgroonga 用に追加されるが、それのみ）

### 改善点

- ❌ `select` 未使用 → 全フィールド転送
- ❌ `events.service.ts` の `getParticipantStats` で全参加者をメモリ集計（O(n)）
- ❌ ループ内 DB 呼び出し（`events.service.ts:participate` の質問バリデーション）
- ❌ Prisma クエリログがないので、本当のスロークエリが見えない（層1 で解消）

## 改善項目

### 1. Prisma `select` の導入

#### Before（問題）

```ts
// apps/api/src/board/board-core.service.ts
const topics = await this.prisma.boardTopic.findMany({
  where: { ... },
  include: {
    author: true,    // User の全フィールド取得（48 カラム）
    category: true,
    posts: {
      include: { author: true },
    },
  },
});
```

→ レスポンスに `passwordHash`, `lastLoginAt` 等の不要フィールドも含まれる + ネットワーク転送量大。

#### After（改善）

```ts
const topics = await this.prisma.boardTopic.findMany({
  where: { ... },
  select: {
    id: true,
    title: true,
    body: true,
    publishStatus: true,
    isPinned: true,
    viewCount: true,
    postCount: true,
    likeCount: true,
    createdAt: true,
    updatedAt: true,
    author: {
      select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
    },
    category: { select: { id: true, name: true, sortOrder: true } },
  },
});
```

→ 必要フィールドのみ取得、レスポンスサイズ 30-50% 削減見込み、`passwordHash` 等の漏洩リスクも消える。

#### 適用優先順位

| 優先度 | 対象                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| 高     | 一覧 API（`findAllTopics`, `findAllEvents`, `findAllProducts`, `findAllVideos`, `findAllProjects`, `findAllUsers`） |
| 中     | 詳細 API（`findOneTopic` 等、必要フィールドはほぼ全部だが author 等の関連は select 化）                             |
| 低     | 内部用 service 関数（管理画面用、トラフィック少）                                                                   |

#### `User` の安全な select パターン

`User` モデルから取り出してよいフィールド:

```ts
// apps/api/src/common/select-presets.ts
import type { Prisma } from "@prisma/client";

export const USER_PUBLIC_SELECT: Prisma.UserSelect = {
  id: true,
  name: true,
  role: true,
  rankId: true,
  profile: {
    select: {
      avatarUrl: true,
      gender: true,
      occupation: true,
    },
  },
  publicInfo: {
    select: {
      nickname: true,
      prefecture: true,
      publicStatus: true,
    },
  },
};

export const USER_DETAIL_SELECT: Prisma.UserSelect = {
  ...USER_PUBLIC_SELECT,
  email: true, // 詳細ページのみ
  joinedAt: true,
  // passwordHash や refreshTokens は絶対に含めない
};
```

→ 各 service で `include: { author: true }` の代わりに `select: { author: { select: USER_PUBLIC_SELECT } }`。

### 2. N+1 問題の解消

#### 例1: `getParticipantStats`（events.service.ts）

#### Before

```ts
// 全参加者をメモリ取得 → JS でフィルタ
const participants = await prisma.eventParticipant.findMany({
  where: { eventId },
  include: { user: true },
});
const totalApplied = participants.length;
const totalConfirmed = participants.filter((p) => p.status === "confirmed").length;
const totalAttended = participants.filter((p) => p.status === "attended").length;
// ... 他複数の集計
```

参加者 1000 人なら 1000 行 + リレーションを毎回ロード → メモリ・CPU 負荷大。

#### After

```ts
// SQL 集計に置き換え
const stats = await prisma.eventParticipant.groupBy({
  by: ["status"],
  where: { eventId },
  _count: { _all: true },
});

const result = {
  totalApplied: stats.reduce((s, x) => s + x._count._all, 0),
  totalConfirmed: stats.find((s) => s.status === "confirmed")?._count._all ?? 0,
  totalAttended: stats.find((s) => s.status === "attended")?._count._all ?? 0,
  // ...
};
```

→ 1 クエリで終わる、データベース内で集計が走るので速い。

#### 例2: 質問バリデーション（events.service.ts:participate）

#### Before

```ts
// ループ内で毎回 question を取得
for (const answer of answers) {
  const question = await prisma.eventApplicationQuestion.findUnique({
    where: { id: answer.questionId },
  });
  if (!question) throw new BusinessException(...);
  // ... バリデーション
}
```

#### After

```ts
// 一括取得 → メモリ上で参照
const questions = await prisma.eventApplicationQuestion.findMany({
  where: { id: { in: answers.map(a => a.questionId) } },
  select: { id: true, isRequired: true, questionType: true, options: true },
});
const questionMap = new Map(questions.map(q => [q.id, q]));

for (const answer of answers) {
  const question = questionMap.get(answer.questionId);
  if (!question) throw new BusinessException(...);
  // ... バリデーション
}
```

→ ループ内 DB 呼び出しが消える。100 回答なら 100 クエリ → 1 クエリ。

### 3. 一覧クエリのインデックス確認

主要な一覧 API で WHERE / ORDER BY に使うカラムにインデックスが効いているか:

```sql
-- スロークエリ EXPLAIN ANALYZE で確認
EXPLAIN ANALYZE
SELECT id, title FROM board_topics
WHERE category_id = '...' AND deleted_at IS NULL
ORDER BY is_pinned DESC, created_at DESC
LIMIT 20;
```

`Index Scan` が出ていれば OK、`Seq Scan` ならインデックス追加要。

#### 既存インデックス確認

`apps/api/prisma/schema.prisma` の `@@index([...])` を grep。一覧 API で使うカラムが含まれているか確認:

| ドメイン   | 既存 index                                     | 不足 index 候補          |
| ---------- | ---------------------------------------------- | ------------------------ |
| BoardTopic | `[categoryId, isPinned, sortOrder, createdAt]` | OK                       |
| Event      | `[startAt]`, `[status]`                        | `[status, startAt]` 複合 |
| Product    | `[publishStatus, salesCount]`                  | OK                       |
| User       | `[email]`, `[role]`                            | OK                       |

→ 既存で十分そうだが、層1 計測でスロークエリが見つかれば個別に追加マイグレ。

### 4. 大量メール送信の並列化

`apps/api/src/broadcasts/dispatchers/` で大量受信者にメール送信する場合、シーケンシャルに送ると遅い:

#### Before

```ts
for (const recipient of recipients) {
  await sendEmail(recipient);
}
// 1000 人 × 100ms = 100 秒
```

#### After

```ts
import pLimit from "p-limit";
const limit = pLimit(10); // 並列度 10

await Promise.all(recipients.map((r) => limit(() => sendEmail(r))));
// 1000 人 / 10 並列 = 10 秒
```

→ 既に BullMQ ジョブで非同期化されているので、ジョブ内のディスパッチを並列化。

### 5. Prisma クエリログ（開発時のみ）

開発環境で Prisma クエリ時間を見る:

```ts
// apps/api/src/prisma/prisma.service.ts
new PrismaClient({
  log: process.env.NODE_ENV === "development" ? [{ emit: "stdout", level: "query" }] : [],
});
```

→ 開発時に `[1.2ms] SELECT ...` が見える。スロークエリの目視チェックに有用。

## 実装ステップ

### ステップ1: select-presets を整備

- `apps/api/src/common/select-presets.ts` に `USER_PUBLIC_SELECT` 等を集約
- 各 service の `include` を `select` に置換

### ステップ2: 一覧 API の select 適用

- 6 ドメイン（events / products / videos / projects / users / board）から優先的に
- 適用前後でレスポンスサイズ計測

### ステップ3: getParticipantStats を SQL 化

- `groupBy` で書き換え
- 既存 spec を破壊しないか確認

### ステップ4: 質問バリデーションの N+1 解消

- ループ前に一括取得 + Map 化
- 同様パターンが他にもあれば順次

### ステップ5: ブロードキャスト並列化

- `p-limit` 導入 + 並列度 10 で送信

### ステップ6: 開発環境 Prisma クエリログ有効化

- 開発時のみ stdout

## テスト方針

### 単体テスト

- 既存 service spec が `select` 化後も同じ結果を返すか
- `getParticipantStats` の SQL 化前後で同じ集計値が返るか

### 計測

- 改善前後で `responseTime` を Sentry で比較
- レスポンスサイズを Network タブで比較

## 確定事項（2026-04-25）

- ✅ `select-presets.ts` に共通プリセット集約（USER_PUBLIC_SELECT 等）
- ✅ 一覧 6 ドメインから優先的に適用、内部用は後回し
- ✅ ブロードキャスト並列度: **10**（p-limit、Resend 無料プラン rate limit 内）
- ✅ getParticipantStats は SQL 集計（groupBy）に置き換え
- ✅ 質問バリデーションのループ内 DB 呼び出しは一括取得 + Map 化に変更

## 残確認事項

- [ ] 既存 API レスポンス互換性: フィールド削減が clientside で問題ないか（実装着手時に確認）
- [ ] 一覧 API のレスポンス形式変更に伴うフロント側修正の範囲（順次対応）

## 成果物

- `apps/api/src/common/select-presets.ts`（新規）
- 6 ドメインの service 修正（`include` → `select`）
- `apps/api/src/events/events.service.ts`（`getParticipantStats` SQL 化、質問バリデーション一括化）
- `apps/api/src/broadcasts/dispatchers/*.ts`（並列化）
- `apps/api/src/prisma/prisma.service.ts`（開発時クエリログ）
- 各 service spec の更新
