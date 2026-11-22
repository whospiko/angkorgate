import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';
import { inferMessage } from '../utils/http.util';

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponseDto<T> | T> {
    constructor(private readonly reflector: Reflector) { }

    intercept(
        context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<ApiResponseDto<T> | T> {
        const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip || process.env.NODE_ENV === 'test') return next.handle();

        const http = context.switchToHttp();
        const req = http.getRequest<Request & { requestId?: string; startTime?: number }>();
        const res = http.getResponse<Response>();

        return next.handle().pipe(
            map((data) => {
                // If controller already returned an envelope, don't double-wrap
                if (
                    data &&
                    typeof data === 'object' &&
                    'success' in data &&
                    'statusCode' in data
                ) {
                    return data as unknown as ApiResponseDto<T>;
                }

                const durationMs = req.startTime
                    ? Date.now() - req.startTime
                    : undefined;

                return {
                    success: true,
                    statusCode: res.statusCode || 200,
                    message: inferMessage(req.method, res.statusCode),
                    data: (data ?? null) as T,
                    meta: {
                        timestamp: new Date().toISOString(),
                        path: req.originalUrl,
                        requestId: req.requestId ?? '',
                        durationMs,
                    },
                };
            }),
        );
    }
}