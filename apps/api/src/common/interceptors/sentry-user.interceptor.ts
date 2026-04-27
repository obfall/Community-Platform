import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import type { Request } from "express";
import type { Observable } from "rxjs";

interface AuthenticatedUser {
  id: string;
}

/**
 * 認証済みリクエストの user.id を Sentry スコープにセットする。
 * guard の後に走るため req.user が解決済み。
 * email / username は PII リスク回避のため送らない。
 */
@Injectable()
export class SentryUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (req.user?.id) {
      Sentry.setUser({ id: req.user.id });
    }
    return next.handle();
  }
}
