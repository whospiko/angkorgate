import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ApiResponseDto } from '../dto/api-response.dto';
import { extractFieldFromConstraint } from '../utils/database-error.util';

interface PgError {
    code?: string;
    detail?: string;
    constraint?: string;
    column?: string;
    table?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request & { requestId?: string }>();

        const { statusCode, message, error, details } = this.normalize(exception);

        // 5xx → log full stack; 4xx → log single line
        if (statusCode >= 500) {
            this.logger.error(
                `${req.method} ${req.originalUrl} → ${statusCode} ${message}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
        } else {
            this.logger.warn(
                `${req.method} ${req.originalUrl} → ${statusCode} ${message}`,
            );
        }

        const body = ApiResponseDto.fail(statusCode, message, error, details, {
            path: req.originalUrl,
            requestId: req.requestId ?? '',
        });

        res.status(statusCode).json(body);
    }

    private normalize(exception: unknown): {
        statusCode: number;
        message: string;
        error: string;
        details: unknown;
    } {
        // 1. Nest HttpException
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();

            // validation errors come as { message: string[], error: 'Bad Request' }
            if (
                typeof response === 'object' &&
                response !== null &&
                'message' in response
            ) {
                const r = response as {
                    message: string | string[];
                    error?: string;
                    details?: unknown;
                };
                const messages = Array.isArray(r.message) ? r.message : [r.message];
                return {
                    statusCode: status,
                    message: messages.length === 1 ? messages[0] : 'Validation failed',
                    error: r.error ?? exception.name,
                    details: Array.isArray(r.message) ? messages : r.details ?? null,
                };
            }
            return {
                statusCode: status,
                message: typeof response === 'string' ? response : exception.message,
                error: exception.name,
                details: null,
            };
        }

        // 2. TypeORM QueryFailedError
        if (exception instanceof QueryFailedError) {
            const driverError = (exception as unknown as { driverError: PgError })
                .driverError;
            return this.fromPostgresError(driverError, exception.message);
        }

        // 3. Plain Error
        if (exception instanceof Error) {
            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message:
                    process.env.NODE_ENV === 'production'
                        ? 'Internal server error'
                        : exception.message,
                error: 'Internal Server Error',
                details: null,
            };
        }

        // 4. Anything else (thrown strings, objects)
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unexpected error',
            error: 'Internal Server Error',
            details: process.env.NODE_ENV === 'production' ? null : exception,
        };
    }

    /** Postgres error codes → user-friendly messages */
    private fromPostgresError(
        pg: PgError | undefined,
        fallback: string,
    ): { statusCode: number; message: string; error: string; details: unknown } {
        const code = pg?.code;
        const constraint = pg?.constraint ?? '';

        // 23505 = unique_violation
        if (code === '23505') {
            const field = extractFieldFromConstraint(constraint, pg?.detail);
            return {
                statusCode: HttpStatus.CONFLICT,
                message: field
                    ? `${field} is already in use`
                    : 'Duplicate value violates unique constraint',
                error: 'Conflict',
                details: { constraint, field },
            };
        }

        // 23503 = foreign_key_violation
        if (code === '23503') {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Referenced record does not exist or is in use',
                error: 'Bad Request',
                details: { constraint, detail: pg?.detail },
            };
        }

        // 23502 = not_null_violation
        if (code === '23502') {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: `Missing required field: ${pg?.column ?? 'unknown'}`,
                error: 'Bad Request',
                details: { column: pg?.column, table: pg?.table },
            };
        }

        // 23514 = check_violation
        if (code === '23514') {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: `Value violates constraint: ${constraint || 'unknown'}`,
                error: 'Bad Request',
                details: { constraint },
            };
        }

        // 22P02 = invalid_text_representation (bad UUID, etc.)
        if (code === '22P02') {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Invalid value format',
                error: 'Bad Request',
                details: { detail: pg?.detail },
            };
        }

        // Unknown DB error → 500 (log will show full)
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message:
                process.env.NODE_ENV === 'production'
                    ? 'Database error'
                    : fallback,
            error: 'Internal Server Error',
            details: null,
        };
    }
}