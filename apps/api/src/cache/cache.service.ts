import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

/**
 * Cache-Aside パターンの薄いラッパ。ioredis を直接使う。
 *
 * - Redis 接続情報がない環境（テスト等）では No-op になり、常に factory を実行する
 * - 環境別 prefix を全キーに自動付与（dev / staging / prod が同じ Redis を共有しても衝突しない）
 * - getOrSet で「キャッシュを見て、なければ DB から取って入れる」を 1 行で書ける
 * - invalidate(prefix) で `prefix*` の全キーを SCAN + UNLINK で削除
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis | null;
  private readonly envPrefix: string;

  constructor() {
    this.envPrefix = `${process.env.NODE_ENV ?? "development"}:`;

    if (!process.env.REDIS_HOST) {
      this.redis = null;
      this.logger.log("REDIS_HOST 未設定 — キャッシュは No-op で動作します");
      return;
    }

    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB ?? 0),
      // 起動時に Redis が落ちていてもアプリ自体は立ち上がるよう、retryStrategy で諦めずに繋ぎ続ける
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });

    this.redis.on("error", (err) => {
      // 接続エラーは warn レベルで集約。getOrSet 時は factory に fallback するので致命ではない
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Cache-Aside: cacheKey でキャッシュを見て、なければ factory を実行して結果をセット。
   *
   * Redis 障害時は factory を直接実行して値を返す（fail-open）。これによりキャッシュ層が
   * 一時的に死んでもアプリは動き続ける。
   */
  async getOrSet<T>(cacheKey: string, factory: () => Promise<T>, ttlSeconds: number): Promise<T> {
    if (!this.redis) return factory();

    const fullKey = this.envPrefix + cacheKey;

    try {
      const cached = await this.redis.get(fullKey);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      this.logger.warn(`cache get failed (${cacheKey}): ${(err as Error).message}`);
      return factory();
    }

    const fresh = await factory();

    try {
      await this.redis.set(fullKey, JSON.stringify(fresh), "EX", ttlSeconds);
    } catch (err) {
      this.logger.warn(`cache set failed (${cacheKey}): ${(err as Error).message}`);
    }

    return fresh;
  }

  /**
   * 与えた prefix にマッチする全キーを削除（書き込み時の無効化用）。
   *
   * SCAN で軽量に列挙し UNLINK で非ブロッキング削除。
   * 例: invalidate("events:") → `prod:events:featured` 等を全削除
   */
  async invalidate(prefix: string): Promise<void> {
    if (!this.redis) return;

    const pattern = this.envPrefix + prefix + "*";
    try {
      const stream = this.redis.scanStream({ match: pattern, count: 100 });
      const pipeline = this.redis.pipeline();
      let pendingDeletes = 0;

      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length === 0) continue;
        pipeline.unlink(...keys);
        pendingDeletes += keys.length;
      }

      if (pendingDeletes > 0) {
        await pipeline.exec();
      }
    } catch (err) {
      this.logger.warn(`cache invalidate failed (${prefix}): ${(err as Error).message}`);
    }
  }

  /** 単一キーの削除（テスト等で使う想定）。 */
  async del(cacheKey: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.unlink(this.envPrefix + cacheKey);
    } catch (err) {
      this.logger.warn(`cache del failed (${cacheKey}): ${(err as Error).message}`);
    }
  }
}
