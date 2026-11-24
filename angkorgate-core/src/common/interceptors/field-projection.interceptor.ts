import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class FieldProjectionInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const apiKey = req.apiKey;
        const requestedFieldsParam = req.query?.fields;

        // Determine target resource from URL path
        const path = (req.path || '').toLowerCase();
        let resource: string | null = null;
        if (path.includes('/customers')) resource = 'customers';
        else if (path.includes('/employees')) resource = 'employees';

        // Allowed fields from API key policy
        const keyProjections: string[] | undefined = resource && apiKey?.fieldProjections?.[resource];
        const hasKeyPolicy = Array.isArray(keyProjections) && keyProjections.length > 0;

        // Sparse fieldsets from query param ?fields=fullName,gender
        let requestedFields: string[] | null = null;
        if (requestedFieldsParam && typeof requestedFieldsParam === 'string') {
            requestedFields = requestedFieldsParam
                .split(',')
                .map((f) => f.trim())
                .filter(Boolean);
        }

        // Determine effective allowed fields
        let effectiveFields: string[] | null = null;
        if (hasKeyPolicy) {
            if (requestedFields && requestedFields.length > 0) {
                // Client cannot request fields forbidden by API Key policy
                effectiveFields = requestedFields.filter((f) => keyProjections.includes(f));
            } else {
                effectiveFields = keyProjections;
            }
        } else if (requestedFields && requestedFields.length > 0) {
            effectiveFields = requestedFields;
        }

        // If no field restriction applies, pass through unaltered
        if (!effectiveFields || effectiveFields.length === 0) {
            return next.handle();
        }

        const allowedSet = new Set(effectiveFields);

        return next.handle().pipe(
            map((data) => this.filterData(data, allowedSet)),
        );
    }

    private filterData(data: any, allowedSet: Set<string>): any {
        if (!data || typeof data !== 'object') {
            return data;
        }

        // Paginated envelope { data: [...], meta: ... }
        if (Array.isArray(data.data)) {
            return {
                ...data,
                data: data.data.map((item: any) => this.projectItem(item, allowedSet)),
            };
        }

        // Paginated envelope { items: [...], total: ... }
        if (Array.isArray(data.items)) {
            return {
                ...data,
                items: data.items.map((item: any) => this.projectItem(item, allowedSet)),
            };
        }

        // Direct Array of items
        if (Array.isArray(data)) {
            return data.map((item) => this.projectItem(item, allowedSet));
        }

        // Single object
        return this.projectItem(data, allowedSet);
    }

    private projectItem(item: any, allowedSet: Set<string>): any {
        if (!item || typeof item !== 'object') return item;

        const projected: Record<string, any> = {};

        // Pick enumerated properties
        for (const key of Object.keys(item)) {
            if (allowedSet.has(key)) {
                projected[key] = item[key];
            }
        }

        // Also evaluate class getters (e.g. isMinor)
        for (const allowedKey of allowedSet) {
            if (!(allowedKey in projected) && (allowedKey in item || (item as any)[allowedKey] !== undefined)) {
                projected[allowedKey] = (item as any)[allowedKey];
            }
        }

        return projected;
    }
}
