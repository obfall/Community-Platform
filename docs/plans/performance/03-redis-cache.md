# 03: Redis キャッシュ層の導入

## 目的

頻繁にアクセスされる読み込み系データ（マスタデータ・人気コンテンツ等）を Redis にキャッシュし、DB 負荷とレスポンス時間を削減する。

## 現状調査

- ✅ `ioredis` + `@nestjs/bullmq` 導入済（BullMQ ジョブキュー用途）
- ✅ Redis 接続は `REDIS_HOST` 環境変数で条件付き初期化
- ❌ キャッシュ用途の Redis 利用なし（全て DB 直クエリ）

## 戦略

### キャッシュする / しないの判断基準

#### ✅ キャッシュする

- **マスタデータ**: ランク・機能設定・カテゴリ・FAQ 等の **更新頻度が低く参照頻度が高い** もの
- **集計結果**: ダッシュボード統計、ランキング、月次/週次レポート
- **公開一覧の上位 N 件**: 公開イベント上位 / 公開動画上位 等

#### ❌ キャッシュしない

- ユーザー固有データ（プロフィール / 通知 / マイページ等、キーが大量になる）
- リアルタイム性が重要（チャット / 通知の最新状態）
- 頻繁に更新される（投稿一覧の最新ページ等）

### キャッシュ戦略パターン

| パターン          | 説明                                                | 採用例                      |
| ----------------- | --------------------------------------------------- | --------------------------- |
| **Cache-Aside**   | 読み: DB → Redis セット、書き: DB 更新 + Redis 削除 | マスタデータ、集計値        |
| **Write-Through** | 書き時に Redis も即更新                             | 集計値、ランキング          |
| **TTL ベース**    | 一定時間で自動失効                                  | 集計値、外部 API レスポンス |

→ Phase 11.2 では **Cache-Aside + TTL** を採用。シンプルで間違えにくい。

### TTL（Time To Live）の方針

| データ種別                                     | TTL    | 理由                                  |
| ---------------------------------------------- | ------ | ------------------------------------- |
| マスタデータ（FeatureSetting / MemberRank 等） | 1 時間 | 管理者が稀に更新、即時反映でなくて OK |
| FAQ 一覧                                       | 30 分  | 編集頻度低、検索流入                  |
| 公開イベント上位                               | 5 分   | 新着の反映と高速化のバランス          |
| 動画一覧                                       | 5 分   | 〃                                    |
| ダッシュボード統計                             | 10 分  | 重い集計、即時性は不要                |
| ランキング                                     | 15 分  | 〃                                    |

→ TTL は **「更新の即時性」と「キャッシュ効果」のバランス** で決める。短すぎるとキャッシュ意味なし、長すぎると古いデータが見える。

## 実装ステップ

### ステップ1: CacheModule の導入

```bash
pnpm --filter @community-platform/api add @nestjs/cache-manager cache-manager cache-manager-ioredis-yet
```

`apps/api/src/cache/cache.module.ts`（新規）:

```ts
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import type { ModuleMetadata } from "@nestjs/common";
import { redisStore } from "cache-manager-ioredis-yet";

export const CACHE_MODULE_CONFIG: ModuleMetadata["imports"] = [
  NestCacheModule.registerAsync({
    isGlobal: true,
    useFactory: async () => {
      // Redis 接続情報がない場合はインメモリにフォールバック（dev 等）
      if (!process.env.REDIS_HOST) {
        return { ttl: 5 * 60_000 };
      }
      const store = await redisStore({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
        db: Number(process.env.REDIS_DB ?? 0),
        ttl: 5 * 60_000, // デフォルト 5 分
      });
      return { store: () => store };
    },
  }),
];
```

`app.module.ts` で `imports: [...CACHE_MODULE_CONFIG, ...]`。

### ステップ2: 共通キャッシュサービス（オプション）

頻出パターンを共通化:

```ts
// apps/api/src/cache/cache-helpers.service.ts
import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";

@Injectable()
export class CacheHelpers {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  /**
   * cacheKey でキャッシュ取得、無ければ factory を実行して結果をセット
   */
  async getOrSet<T>(cacheKey: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = await this.cache.get<T>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;
    const fresh = await factory();
    await this.cache.set(cacheKey, fresh, ttlMs);
    return fresh;
  }

  /**
   * prefix にマッチする全キーを削除（更新時の無効化用）
   */
  async invalidate(prefix: string): Promise<void> {
    // ioredis 直接アクセスで SCAN + DEL
    const store = (this.cache.store as any).client;
    if (!store) return;
    const stream = store.scanStream({ match: `${prefix}*`, count: 100 });
    stream.on("data", async (keys: string[]) => {
      if (keys.length) await store.unlink(...keys);
    });
  }
}
```

### ステップ3: マスタデータキャッシュ

例: FeatureSetting（機能設定マスタ）:

```ts
// apps/api/src/feature-settings/feature-settings.service.ts
async findAll() {
  return this.cacheHelpers.getOrSet(
    "master:feature-settings:all",
    () => this.prisma.featureSetting.findMany({ orderBy: { sortOrder: "asc" } }),
    60 * 60_000,  // 1 時間
  );
}

// 更新時に無効化
async update(key: string, dto: UpdateFeatureSettingDto) {
  const updated = await this.prisma.featureSetting.update(...);
  await this.cacheHelpers.invalidate("master:feature-settings");
  return updated;
}
```

#### キャッシュ対象マスタ一覧（候補）

- `FeatureSetting`（機能トグル設定）
- `MemberRank`（会員ランクマスタ）
- `AppSetting`（アプリ設定）
- `BroadcastTemplate`（メールテンプレート）
- `MemberAttribute`（会員属性定義）
- `OrientationPage`（オリエンテーション）
- `BannedWord`（NG ワード）
- `PointRule`（ポイントルール）
- `Category`（カテゴリ全般）

→ 9 マスタを 1 時間 TTL でキャッシュ。

### ステップ4: 集計値・ランキングキャッシュ

例: ダッシュボード統計:

```ts
// apps/api/src/analytics/analytics.service.ts
async getDashboardStats() {
  return this.cacheHelpers.getOrSet(
    "stats:dashboard",
    async () => {
      const [
        totalUsers, totalEvents, totalRevenue, ...
      ] = await Promise.all([...]);
      return { totalUsers, totalEvents, totalRevenue, ... };
    },
    10 * 60_000,  // 10 分
  );
}
```

### ステップ5: 公開コンテンツの上位リスト

例: 公開イベント上位 10 件（トップページ用）:

```ts
async findFeatured() {
  return this.cacheHelpers.getOrSet(
    "events:featured",
    () => this.prisma.event.findMany({
      where: { status: "recruiting", deletedAt: null },
      orderBy: [{ startAt: "asc" }],
      take: 10,
      select: EVENT_PUBLIC_SELECT,
    }),
    5 * 60_000,
  );
}
```

イベント作成・更新時に `invalidate("events:")` で無効化。

### ステップ6: キャッシュキー設計

衝突しないよう **prefix:scope:key 形式** で統一:

```
master:feature-settings:all
master:member-ranks:all
stats:dashboard
events:featured
events:detail:{id}
videos:featured
faq:list
```

→ `invalidate("events:")` で events 系全部、`invalidate("master:")` で マスタ全部、を狙える。

### ステップ7: キャッシュ無効化のタイミング

書き込み系 API で対応:

| 更新内容                 | 無効化対象キー              |
| ------------------------ | --------------------------- |
| Event 作成 / 更新 / 削除 | `events:*`                  |
| FeatureSetting 更新      | `master:feature-settings:*` |
| MemberRank 更新          | `master:member-ranks:*`     |
| Video 公開               | `videos:*`                  |
| FaqArticle 編集          | `faq:*`                     |

各 service の write メソッドで `await this.cacheHelpers.invalidate("...")`。

### ステップ8: モニタリング

Redis のヒット率・キャッシュサイズを観察:

```bash
# Redis CLI で確認
redis-cli INFO stats
# keyspace_hits / keyspace_misses でヒット率計算
```

ヒット率 80%+ なら効果あり、20% 未満なら設定見直し。

## 注意事項

### 認可情報の扱い

ユーザー固有のデータをキャッシュする場合、キーに `user:{id}` を含めて他ユーザーに漏れないようにする:

```
user:{userId}:notifications  ← 他ユーザーに漏れない
```

ただし Phase 11.2 では基本的にユーザー固有データはキャッシュ対象外（ノイズが大きいので）。

### キャッシュ汚染対策

キャッシュキーの prefix を `process.env.NODE_ENV` で分けるか、Redis db 番号を分ける:

```
prod:master:feature-settings:all
dev:master:feature-settings:all
```

→ dev / staging / prod で同じ Redis を共有する場合の事故防止。

## 確定事項（2026-04-25）

- ✅ Redis キャッシュ対象: **マスタ 9 個 + 集計 + 公開上位リスト**
- ✅ TTL: **マスタ 1 時間 / 集計 10 分 / 公開上位 5 分**
- ✅ 環境別キャッシュ prefix（`process.env.NODE_ENV` ベース、prod / dev / staging で分離）
- ✅ ユーザー固有データは Phase 11.2 でキャッシュ対象外
- ✅ ライブラリは `@nestjs/cache-manager` + `cache-manager-ioredis-yet` を採用

## 残確認事項

- [ ] Redis ヒット率の監視は Phase 12 で本格化（Phase 11.2 では手動確認）

## 成果物

- `apps/api/src/cache/cache.module.ts`
- `apps/api/src/cache/cache-helpers.service.ts`
- 各マスタ service の修正（FeatureSetting / MemberRank 等 9 ドメイン）
- 集計系 service の修正（Analytics / Points 等）
- 公開上位リスト系 service の修正（Events / Videos 等）
- 各 write メソッドに `invalidate` 呼び出し追加
