import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, AuditOptions } from '../decorators/audit.decorator';
import { AuditService } from '../services/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly audit: AuditService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const meta = this.reflector.get<AuditOptions | undefined>(
            AUDIT_KEY,
            context.getHandler(),
        );
        if (!meta) return next.handle();

        const req = context.switchToHttp().getRequest();
        const actorId: string | null = req.user?.id ?? null;
        const ipAddress: string | null = req.ip ?? null;
        const entityIdParam = meta.entityIdParam ?? 'id';
        const entityId: string | null = req.params?.[entityIdParam] ?? null;

        return next.handle().pipe(
            tap((response) => {
                // Fire-and-forget — don't await, don't block the response
                void this.audit.log({
                    actorId,
                    ipAddress,
                    action: meta.action,
                    entity: meta.entity,
                    entityId,
                    newValue: isPlainObject(response) ? (response as Record<string, unknown>) : null,
                });
            }),
        );
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}