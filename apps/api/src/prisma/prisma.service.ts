import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "development"
          ? [
              { emit: "event", level: "query" },
              { emit: "stdout", level: "info" },
              { emit: "stdout", level: "warn" },
              { emit: "stdout", level: "error" },
            ]
          : [
              { emit: "stdout", level: "warn" },
              { emit: "stdout", level: "error" },
            ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Database connected");

    // 開発時のみ全クエリの実行時間をログ出力。100ms 超は `[~100ms]`、
    // 1000ms 超は `[SLOW]` でマークし、N+1 やスロークエリの目視発見を補助。
    if (process.env.NODE_ENV === "development") {
      // Prisma の query イベント型は log 設定が "event" を含むときだけ有効になるため
      // 型推論が走らない。明示的にハンドラ型を指定する。
      const onQuery = (event: { query: string; params: string; duration: number }) => {
        const tag = event.duration > 1000 ? "[SLOW] " : event.duration > 100 ? "[~100ms] " : "";
        this.logger.debug(`${tag}${event.duration}ms ${event.query}`);
      };
      // @ts-expect-error -- $on('query', ...) は log: [{ emit: "event", level: "query" }] 時のみ有効
      this.$on("query", onQuery);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Database disconnected");
  }
}
