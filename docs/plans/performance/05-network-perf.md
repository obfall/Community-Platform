# 05: ネットワーク・データ転送量最適化

## 目的

API リクエスト数・レスポンスサイズ・WebSocket 通信量を削減し、モバイル回線・低速環境でも快適に使えるようにする。

## 現状調査

- ⚠️ pagination の `limit` がドメインによって 20 / 50 でバラバラ
- ⚠️ TanStack Query `staleTime` がほぼ未設定（毎回 fetch）→ Phase 11.1 で 60 秒に統一予定
- ❌ HTTP `Cache-Control` ヘッダー未設定
- ⚠️ WebSocket（Socket.io）の通信量・頻度が不明
- ✅ TanStack Query の `useAuth` で `staleTime: 5 分` 設定あり

## 改善項目

### 1. HTTP `Cache-Control` ヘッダーの設定

#### 対象: 公開で変動少ない GET API

```ts
// apps/api/src/faq/faq.controller.ts
import { Header } from "@nestjs/common";

@Get()
@Header("Cache-Control", "public, max-age=300")  // 5 分間ブラウザキャッシュ
async findAll(@Query() query: FaqQueryDto) {
  return this.faqService.findAll(query);
}
```

#### 対象選定

| API                  | 公開度   | TTL    | キャッシュ可否                            |
| -------------------- | -------- | ------ | ----------------------------------------- |
| `GET /faq`           | 公開     | 300 秒 | ✅ 可                                     |
| `GET /events`        | 認証必要 | —      | ⚠️ private（個人化要素少なければ public） |
| `GET /products`      | 認証必要 | —      | ⚠️ 〃                                     |
| `GET /users/:id`     | 認証必要 | 60 秒  | ✅ public, max-age=60                     |
| `GET /board/topics`  | 認証必要 | —      | ❌ 新着優先、キャッシュしない             |
| `GET /chat/...`      | 認証必要 | —      | ❌ リアルタイム                           |
| `GET /notifications` | 個人     | —      | ❌ 個人化                                 |

**判断指針**:

- `public, max-age=N`: 全ユーザー共通、公開可
- `private, max-age=N`: ユーザー固有、ブラウザキャッシュのみ可
- `no-cache, no-store`: キャッシュ禁止（個人通知等）

#### CDN（Cloudflare）のキャッシュとの関係

本番で Cloudflare 前段にある場合、`public` の API は Cloudflare がエッジキャッシュする。`private` はブラウザのみ。

→ 本番デプロイ構成決定後（Phase 12）に再調整。Phase 11.2 では `public` / `private` の方針だけ決めておく。

### 2. ページネーションの統一

#### 現状

| ドメイン                                                 | デフォルト limit |
| -------------------------------------------------------- | ---------------- |
| events / board / products / videos / projects / users 等 | 20               |
| analytics, chat                                          | 50               |

→ バラバラ。

#### 統一案

| パターン                   | デフォルト | 理由                           |
| -------------------------- | ---------- | ------------------------------ |
| 一覧 API（カード表示）     | **20**     | 既存維持、画面 1 枚に収まる量  |
| テーブル系 API（管理画面） | **50**     | 多くのレコードを一度に把握     |
| 通知 / メッセージ          | **30**     | スクロール頻度高め、若干多めに |
| 検索結果                   | **20**     | 既存と同じ                     |

→ ドメイン特性に応じて 20 / 30 / 50 を使い分ける（Phase 11.1 で「各ドメインの既存件数に合わせる」と決めた方針と整合）。

#### `apps/api/src/common/dto/pagination.dto.ts`（共通 DTO）

```ts
import { IsInt, Min, Max, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // 上限を 100 にして過剰な取得を抑止
  limit?: number = 20;
}
```

→ 各ドメインの Query DTO はこれを `extends` して、必要なら `limit` のデフォルト値を override。

### 3. API レスポンスのフィールド削減（層2 と連動）

層2 で `Prisma select` を導入する際、レスポンスの不要フィールドを除去:

- `passwordHash` 等の機密情報（既に除外されているはず、要確認）
- `_count` で十分な場合は関連配列を返さない
- `createdAt` / `updatedAt` のいずれか一方で済むなら片方のみ

→ レスポンスサイズ 30-50% 削減見込み。

### 4. リスト API の上限ガード

`limit=10000` のような巨大リクエストを防ぐ:

- DTO で `@Max(100)` 適用（上記）
- ハードコード上限を `Math.min(query.limit ?? 20, 100)` で確実化

### 5. WebSocket 通信量の最適化

#### 現状調査が必要な点

- 1 メッセージあたりの payload サイズ
- 1 分あたりの平均メッセージ数
- 通知のリアルタイム配信頻度

#### 改善候補

##### 5-1. ペイロードの最小化

```ts
// Before: 全フィールド含む
socket.emit("chat:message", {
  id: msg.id,
  chatRoomId: msg.chatRoomId,
  senderUserId: msg.senderUserId,
  sender: { id, name, profile: { avatarUrl, gender, occupation, ... }, ...全プロフィール },
  body: msg.body,
  createdAt: msg.createdAt,
  updatedAt: msg.updatedAt,
});

// After: 表示に必要な最小限
socket.emit("chat:message", {
  id: msg.id,
  chatRoomId: msg.chatRoomId,
  senderUserId: msg.senderUserId,
  senderName: msg.sender.name,         // ネスト解消
  senderAvatarUrl: msg.sender.profile?.avatarUrl,
  body: msg.body,
  createdAt: msg.createdAt,
});
```

##### 5-2. プレゼンス情報のスロットリング

「○○さんがタイピング中...」のようなイベントを毎ミリ秒送るのではなく、debounce / throttle で 500ms 〜 1s 単位に集約:

```ts
import { throttle } from "lodash-es";

const emitTyping = throttle(() => {
  socket.emit("chat:typing", { roomId });
}, 1000);

inputRef.current.addEventListener("input", emitTyping);
```

##### 5-3. 通知配信のバッチング

通知を 1 件ずつ即送信せず、数百ミリ秒バッファして配信（連続通知時の負荷軽減）。

→ 実装複雑化、Phase 11.2 では「ペイロード最小化」のみ採用、バッチングは別フェーズ送りで OK か（**確認事項**）。

### 6. TanStack Query キャッシュ統一

Phase 11.1 で「全ドメイン `staleTime: 60_000`」と決定済み。Phase 11.2 で改めて全 hooks を Audit:

```bash
grep -r "useQuery" apps/web/hooks/ | grep -v staleTime
```

`staleTime` 未設定の hooks を発見 → 統一設定追加。

### 7. レスポンス圧縮（gzip / brotli）

NestJS 側で `compression` ミドルウェアを導入してレスポンス body を圧縮:

```bash
pnpm --filter @community-platform/api add compression
pnpm --filter @community-platform/api add -D @types/compression
```

```ts
// apps/api/src/main.ts
import compression from "compression";

app.use(compression());
```

→ JSON レスポンスが 60-80% 圧縮される（特に大きなリスト系で効果大）。Cloudflare 経由なら CDN 側で自動圧縮するので不要だが、念のため API 側でも設定推奨。

### 8. Conditional Requests（ETag / If-None-Match）

将来的に「変わってないリソースの再取得を 304 Not Modified で軽量化」したいが、Phase 11.2 では **対象外**（Phase 12 で CDN 構成と一緒に検討）。

## 実装ステップ

### ステップ1: 共通 PaginationDto 整備

- `apps/api/src/common/dto/pagination.dto.ts` 新規
- 各ドメインの Query DTO に `extends PaginationDto` 適用
- limit 上限 100

### ステップ2: HTTP Cache-Control 適用

- 公開系 API（FAQ / 公開イベント / 公開動画 等）に `@Header` デコレータ
- 個人系 API は `private` or `no-cache`

### ステップ3: WebSocket ペイロード最小化

- ChatGateway 等で emit 内容を必要最小に
- Typing 等のプレゼンスは throttle 1 秒

### ステップ4: gzip 圧縮

- `compression` ミドルウェア
- レスポンスサイズ Before/After 計測

### ステップ5: TanStack Query staleTime Audit

- 全 hooks 確認 → 60 秒に統一

### ステップ6: 改善計測

- Network タブで転送量 Before/After
- Sentry Trace で総レスポンス時間 Before/After

## テスト方針

- ステップ1: 既存の query parameter 互換性が保たれるか
- ステップ4: gzip が効いているか（DevTools Network → Content-Encoding: gzip）
- ステップ5: ページ間遷移で再 fetch されないか確認

## 確定事項（2026-04-25）

- ✅ `Cache-Control` 適用範囲: **公開系のみ `public`**、個人系は何も付けない
- ✅ pagination 上限: **100 件**
- ✅ ドメイン別 limit デフォルト: 一覧 20 / テーブル 50 / 通知 30 / 検索は既存値（Phase 11.1 と整合）
- ✅ gzip 圧縮: **API 側で `compression` ミドルウェア有効化**（CDN との二重処理は許容）
- ✅ WebSocket バッチング: **別フェーズ送り**（Phase 11.2 では payload 最小化のみ）
- ✅ ETag / Conditional Requests: **Phase 12 送り**（Cloudflare 自動処理に任せる）

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/api/src/common/dto/pagination.dto.ts`（新規）
- 各ドメインの Query DTO 修正（PaginationDto を extend）
- 公開系 controller の `@Header("Cache-Control", ...)` 追加
- `apps/api/src/main.ts`（compression ミドルウェア）
- `apps/api/src/chat/chat.gateway.ts`（payload 最小化）
- 各 hooks の `staleTime` 統一（必要なら Phase 11.1 と整合）
- `docs/performance-baseline.md` 更新（転送量 Before/After）
