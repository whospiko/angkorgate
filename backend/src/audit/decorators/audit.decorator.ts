import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit:meta';

export interface AuditMeta {
    action: string;
    entity: string;
}

/**
 * Declares what the AuditInterceptor should log for this handler.
 * entityId is resolved from `params.id` by default; override with entityIdParam.
 */
export interface AuditOptions extends AuditMeta {
    entityIdParam?: string; // default 'id'
}

export const Audit = (options: AuditOptions | string) => {
    // Support shorthand: @Audit('patient.create')
    if (typeof options === 'string') {
        const [entity] = options.split('.');
        return SetMetadata(AUDIT_KEY, { action: options, entity });
    }
    return SetMetadata(AUDIT_KEY, options);
};