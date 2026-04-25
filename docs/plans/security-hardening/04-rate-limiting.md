# 04: レートリミット + ログイン試行制限

## 目的

DDoS / ブルートフォース攻撃 / API 乱用を防ぐため、API 全体に **レートリミット** を導入。特にログインエンドポイントには **試行制限** を実装。WebSocket にも上限を設ける。

## 現状調査

### 未実装

- `@nestjs/throttler` 等のレートリミット系パッケージが入っていない
- `main.ts` または各コントローラに `@Throttle()` 設定なし
- ログイン失敗回数制限なし（履歴 `LoginHistory` には記録されるが、BAN 動作なし）
- WebSocket メッセージ送信レートリミットなし

### 関連実装済み

- `LoginHistory` テーブル: 失敗時もレコード残る（`status: failure` + `failureReason`）
  → これを使ってリトライ制限を作れる

## 実装方針

### レートリミット戦略

**全エンドポイント既定値 + 個別調整** で運用:

| 区分                             | 閾値                              | 適用                                                              |
| -------------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| 既定（全エンドポイント）         | 60 req/min/IP                     | `ThrottlerModule` のグローバル設定                                |
| ログイン                         | 5 req/min/IP + 5 req/15min/メール | `@Throttle({ default: { limit: 5, ttl: 60000 } })` + 別途試行制限 |
| ファイルアップロード             | 10 req/min/IP                     | `@Throttle()` 個別設定                                            |
| 他の書き込み系（投稿・コメント） | 30 req/min/IP                     | デフォルト範囲内                                                  |
| 読み込み系（一覧・詳細）         | 既定（60 req/min）                | デフォルト                                                        |
| WebSocket メッセージ送信         | 30 msg/min/接続                   | カスタム実装                                                      |

### ログイン試行制限の二重防御

1. **`@nestjs/throttler` で IP ベース制限**: 5 req/min/IP
2. **`LoginHistory` ベースのアカウント制限**: 同一メールで 5 回失敗 → 15 分間ロック

これで **同一 IP からの大量試行も、複数 IP から同一メールへの分散攻撃も** 防げる。

## 実装ステップ

### ステップ1: `@nestjs/throttler` 導入

```bash
pnpm --filter @community-platform/api add @nestjs/throttler
```

### ステップ2: グローバル設定

`apps/api/src/app.module.ts` に追加:

```ts
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000, // 1 分
        limit: 60,   // 60 req
      },
      {
        name: "strict",
        ttl: 60_000,
        limit: 5,
      },
    ]),
    // ...
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
```

### ステップ3: ログインエンドポイントの個別設定

`apps/api/src/auth/auth.controller.ts`:

```ts
import { Throttle, ThrottlerGuard, SkipThrottle } from "@nestjs/throttler";

@Throttle({ strict: { limit: 5, ttl: 60_000 } })
@Post("login")
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}

@Throttle({ strict: { limit: 5, ttl: 60_000 } })
@Post("password-reset/request")
async requestReset(...) { ... }
```

### ステップ4: ファイルアップロードの個別設定

`apps/api/src/files/files.controller.ts`:

```ts
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Post("upload")
async upload(...) { ... }
```

### ステップ5: ログイン試行制限（アカウントロック）

`apps/api/src/auth/services/login-attempt.service.ts` を新設:

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const MAX_FAILURES = 5;
const LOCK_WINDOW_MIN = 15;

@Injectable()
export class LoginAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async isLocked(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - LOCK_WINDOW_MIN * 60_000);
    const failures = await this.prisma.loginHistory.count({
      where: {
        userId,
        status: "failure",
        createdAt: { gte: since },
      },
    });
    return failures >= MAX_FAILURES;
  }

  async getRemainingLockSeconds(userId: string): Promise<number> {
    const oldestFailure = await this.prisma.loginHistory.findFirst({
      where: {
        userId,
        status: "failure",
        createdAt: { gte: new Date(Date.now() - LOCK_WINDOW_MIN * 60_000) },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (!oldestFailure) return 0;
    const unlockAt = oldestFailure.createdAt.getTime() + LOCK_WINDOW_MIN * 60_000;
    return Math.max(0, Math.floor((unlockAt - Date.now()) / 1000));
  }
}
```

`auth.service.ts` の login 処理で組み込み:

```ts
async login(dto: LoginDto) {
  const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) {
    await this.recordLoginHistory(null, "failure", "user_not_found");
    throw new BusinessException(ErrorCode.UNAUTHORIZED, 401, "認証情報が無効です");
  }

  // ロックチェック
  if (await this.loginAttemptService.isLocked(user.id)) {
    const remaining = await this.loginAttemptService.getRemainingLockSeconds(user.id);
    throw new BusinessException(
      ErrorCode.ACCOUNT_LOCKED,
      429,
      `ログイン試行が上限を超えました。${Math.ceil(remaining / 60)} 分後に再試行してください`,
    );
  }

  // パスワード検証
  const ok = await bcrypt.compare(dto.password, user.passwordHash);
  if (!ok) {
    await this.recordLoginHistory(user.id, "failure", "invalid_password");
    throw new BusinessException(ErrorCode.UNAUTHORIZED, 401, "認証情報が無効です");
  }

  await this.recordLoginHistory(user.id, "success");
  return this.issueTokens(user);
}
```

`ErrorCode.ACCOUNT_LOCKED` は 11.3 のエラーコード集に追加。

### ステップ6: WebSocket レートリミット

`apps/api/src/chat/chat.gateway.ts` に独自実装:

```ts
import { Injectable } from "@nestjs/common";

@Injectable()
class WsRateLimiter {
  private buckets = new Map<string, number[]>(); // socketId → timestamps[]
  private readonly limit = 30;
  private readonly windowMs = 60_000;

  check(socketId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(socketId) ?? [];
    const recent = bucket.filter((ts) => now - ts < this.windowMs);
    if (recent.length >= this.limit) {
      return false; // limit exceeded
    }
    recent.push(now);
    this.buckets.set(socketId, recent);
    return true;
  }

  cleanup(socketId: string) {
    this.buckets.delete(socketId);
  }
}
```

`@SubscribeMessage("chat:send")` ハンドラの先頭で `if (!rateLimiter.check(client.id)) { client.emit("chat:rate-limit"); return; }` で防御。

切断時 (`handleDisconnect`) で `rateLimiter.cleanup(client.id)` してメモリリーク防止。

### ステップ7: ヘルスチェック等を除外

`/health`, `/api/csp-report` などはレートリミット対象外にする:

```ts
@SkipThrottle()
@Get("/health")
health() { ... }
```

### ステップ8: レートリミット超過時のレスポンス整形

`@nestjs/throttler` のデフォルトは `429 Too Many Requests` だが、メッセージが英語。例外フィルタ（11.3）で日本語化:

```ts
// all-exceptions.filter.ts
if (exception instanceof ThrottlerException) {
  return {
    statusCode: 429,
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message: "リクエストが多すぎます。しばらく時間をおいてから再試行してください",
  };
}
```

### ステップ9: 本番でのストレージ（Redis）

`@nestjs/throttler` のデフォルトはメモリストレージ。本番でマルチインスタンスで動かす場合は **Redis ストレージ** に切り替え:

```bash
pnpm --filter @community-platform/api add @nestjs/throttler-storage-redis
```

`ThrottlerModule.forRoot({ storage: new ThrottlerStorageRedisService(redisClient) })` のような設定。Phase 12（本番デプロイ）で検討、本計画ではメモリのまま開始で OK。

## テスト方針

### 単体テスト

- `LoginAttemptService.isLocked()` のロジック検証
- `WsRateLimiter.check()` のロジック検証

### 統合テスト

- `apps/api/test/throttler.e2e-spec.ts`:
  - 60 req/min を超えると 429 が返る
  - ログインに 5 回失敗するとロックされる
  - 15 分後にロックが解除される（時間操作 mock）

### 手動テスト

- curl で連打 → 429 が返る
- ログイン画面でパスワードを 5 回間違える → ロック画面表示

## 確定事項（2026-04-25）

- ✅ グローバル既定: **60 req/min/IP**
- ✅ ログイン試行制限: **5 回失敗で 15 分ロック**（IP 制限と DB 制限の二重防御）
- ✅ ファイルアップロード: **10 req/min**
- ✅ WebSocket: **30 msg/min/接続**
- ✅ ロック中は **完全拒否 + 解除時刻表示**（CAPTCHA は使わない）
- ✅ パスワードリセット申請も **試行制限対象**（5 回/分）
- ✅ Redis ストレージへの切替は **Phase 12 送り**（Phase 11.4 はメモリストレージ）

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/api/package.json`（@nestjs/throttler 追加）
- `apps/api/src/app.module.ts`（ThrottlerModule + GlobalGuard 設定）
- `apps/api/src/auth/auth.controller.ts`（@Throttle 設定）
- `apps/api/src/auth/services/login-attempt.service.ts`
- `apps/api/src/auth/auth.service.ts`（試行制限統合）
- `apps/api/src/files/files.controller.ts`（@Throttle 設定）
- `apps/api/src/chat/chat.gateway.ts`（WsRateLimiter 統合）
- `apps/api/src/common/filters/all-exceptions.filter.ts`（ThrottlerException マッピング、11.3 と統合）
- `apps/api/test/throttler.e2e-spec.ts`
