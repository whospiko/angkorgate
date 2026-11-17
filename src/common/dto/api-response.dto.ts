export interface ApiMeta {
    timestamp: string;
    path: string;
    requestId: string;
    durationMs?: number;
}

export class ApiResponseDto<T = unknown> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    error?: string;
    details?: unknown;
    meta: ApiMeta;

    static ok<T>(
        data: T,
        message = 'OK',
        meta: Partial<ApiMeta> = {},
    ): ApiResponseDto<T> {
        return {
            success: true,
            statusCode: 200,
            message,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                path: meta.path ?? '',
                requestId: meta.requestId ?? '',
                durationMs: meta.durationMs,
            },
        };
    }

    static fail(
        statusCode: number,
        message: string,
        error: string,
        details: unknown,
        meta: Partial<ApiMeta> = {},
    ): ApiResponseDto {
        return {
            success: false,
            statusCode,
            message,
            error,
            details,
            meta: {
                timestamp: new Date().toISOString(),
                path: meta.path ?? '',
                requestId: meta.requestId ?? '',
            },
        };
    }
}