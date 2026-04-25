# 02: バックエンド構造化ログ（pino + ログレベル + traceId）

## 目的

現状の NestJS デフォルト Logger を pino ベースの構造化ログに置き換え、本番運用で

- ログ検索ツール（Grafana Loki / Better Stack / Papertrail 等）で JSON フィルタ可能
- `requestId` でリクエスト単位のログを串刺しできる
- Sentry 送信とログ出力のレベル整合が取れている

状態にする。

## 現状調査

- `apps/api/package.json`: pino / nestjs-pino / winston 等のロガー依存なし
- `apps/api/src/` 内: NestJS デフォルト `Logger` のみ使用
- `apps/api/src/main.ts`: `x-request-id` ヘッダー付与ロジックなし

## ライブラリ選定: nestjs-pino

- `pino` 本体 + `nestjs-pino` 公式連携
- リクエストごとに `req.id` が自動付与される（HTTP ハンドラ内で取得可能）
- Fastify / Express どちらでも動作
- JSON 出力がデフォルト

### 代替検討（採用しない）

- `winston`: 機能豊富だが pino より遅く、JSON 設定が冗長
- NestJS 標準 Logger + 自前拡張: 構造化に限界あり

## ログレベル戦略（再掲 + 詳細化）

| レベル  | 出力条件 | ユースケース                                                         | 送信先                                       |
| ------- | -------- | -------------------------------------------------------------------- | -------------------------------------------- |
| `fatal` | 常時     | プロセス異常終了前（DB 切断、Redis 障害、OOM）                       | stdout + Sentry (fatal)                      |
| `error` | 常時     | 5xx レスポンス、未ハンドル例外、外部 API 500 系                      | stdout + Sentry (error)                      |
| `warn`  | 常時     | 4xx の想定外、境界条件、外部 API 4xx                                 | stdout + Sentry (warning) ※beforeSend で選別 |
| `info`  | 常時     | ログイン成功/失敗、主要な state change、4xx の想定内（権限エラー等） | stdout のみ                                  |
| `debug` | 開発のみ | SQL クエリ、受信ペイロード詳細                                       | stdout のみ                                  |
| `trace` | 開発のみ | 関数呼び出しレベル                                                   | 使用しない                                   |

本番: `info` 以上を出力、開発: `debug` まで。

## 実装ステップ

### ステップ1: nestjs-pino の導入

```bash
pnpm --filter @community-platform/api add nestjs-pino pino pino-http pino-pretty
```

### ステップ2: LoggerModule 設定

`apps/api/src/app.module.ts` に組み込む:

```ts
import { LoggerModule } from "nestjs-pino";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        genReqId: (req, res) => {
          const id = req.headers["x-request-id"] ?? crypto.randomUUID();
          res.setHeader("x-request-id", id);
          return id;
        },
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'req.body.password',
            'req.body.passwordHash',
            '*.password',
          ],
          remove: true,
        },
        serializers: {
          req: (req) => ({ id: req.id, method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
            : undefined,
      },
    }),
    // ...
  ],
})
```

### ステップ3: main.ts で Logger を差し替え

```ts
import { Logger } from "nestjs-pino";

const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));
```

これで `bufferLogs: true` によりブート時のログも pino で出力される。

### ステップ4: 例外フィルタと統合

`01-backend-exception-filter.md` で書き換えた `all-exceptions.filter.ts` に `Logger` を注入し、例外時に適切なレベルで出力:

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const response = buildErrorResponse(exception, req);

    // ログレベル判定
    const statusCode = response.statusCode;
    const logCtx = {
      requestId: req.id,
      userId: req.user?.id,
      code: response.code,
      path: req.url,
      method: req.method,
    };

    if (statusCode >= 500) {
      this.logger.error({ err: exception, ...logCtx }, response.message);
    } else if (statusCode === 401 || statusCode === 403) {
      this.logger.info(logCtx, response.message);
    } else if (statusCode >= 400) {
      this.logger.warn(logCtx, response.message);
    }

    res.status(statusCode).json({ ...response, requestId: req.id });
  }
}
```

### ステップ5: サービス内での使用方針

- サービスクラスで `constructor(private readonly logger: Logger) {}` で注入
- 例外を投げる前に `logger.warn({ context }, "message")` を書かない（例外フィルタで一元的に出力）
- 重要なドメインイベント（決済完了、ポイント付与等）は明示的に `logger.info({ event: "...", ... }, "...")` で記録
- SQL 性能問題のデバッグに `logger.debug({ query, duration }, "slow query")` を局所的に使用

### ステップ6: Sentry breadcrumb との連携

Sentry のブレッドクラムに pino ログを自動投入する設定を検討（`04` と絡む部分だが、ここで準備）:

```ts
// apps/api/src/instrument.ts 側で
Sentry.init({
  beforeSend: (event) => {
    // 04 で詳細化
    return event;
  },
});
```

### ステップ7: 本番でのログ収集先

本番運用では以下のいずれかを想定:

- Railway のログ収集（デフォルト）
- Grafana Loki に送信（Promtail エージェント）
- Better Stack / Papertrail に送信

現時点では Railway デフォルトで十分。将来必要になったら transport を追加する。

## テスト方針

- `npm run dev` で pino-pretty フォーマットが表示される
- 本番モード（`NODE_ENV=production`）で JSON 出力になる
- `x-request-id` ヘッダーを渡すと同じ ID がログに出る
- 渡さない場合は自動生成され、レスポンスヘッダーに返される
- パスワードフィールドが redact で除外される

## 確定事項

- ✅ `nestjs-pino` + `pino` を採用
- ✅ ログ収集先は Railway デフォルトで運用開始、必要になったら SaaS（Better Stack 等）に移行

## 残確認事項

- [ ] ログレベル戦略のマッピングで OK か
- [ ] redact リストの項目（他に除外すべき機密フィールドあるか）
- [ ] サービス内で logger 注入する方針で OK か（個別 import 不要）

## 成果物

- `apps/api/package.json`（依存追加）
- `apps/api/src/app.module.ts`（LoggerModule 設定）
- `apps/api/src/main.ts`（`useLogger` 差し替え）
- `apps/api/src/common/filters/all-exceptions.filter.ts`（Logger 注入 + レベル判定）
