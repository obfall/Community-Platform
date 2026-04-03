import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import type { Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { ApiResponse } from "@community-platform/shared";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const statusCode = context.switchToHttp().getResponse<Response>().statusCode;

    return next.handle().pipe(
      map((data: T) => ({
        data,
        statusCode,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
