import {
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';
import { ApiKeysService } from '../../api-keys/services/api-keys.service';

@Injectable()
export class UnifiedAuthGuard extends AuthGuard('jwt') implements CanActivate {
    constructor(private readonly apiKeysService: ApiKeysService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        // 1. Detect API key handshake in headers
        // Supports x-api-key header or Authorization: Bearer ag_live_... / ag_test_...
        const apiKeyHeader = req.headers['x-api-key'];
        const authHeader = req.headers['authorization'];
        let rawApiKey: string | null = null;

        if (apiKeyHeader && typeof apiKeyHeader === 'string') {
            rawApiKey = apiKeyHeader.trim();
        } else if (authHeader && typeof authHeader === 'string') {
            const parts = authHeader.split(' ');
            if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
                const token = parts[1];
                if (token.startsWith('ag_live_') || token.startsWith('ag_test_')) {
                    rawApiKey = token;
                }
            }
        }

        if (rawApiKey) {
            // Handshake: validates hash, status, expiration, and method allowlist
            const key = await this.apiKeysService.validateApiKey(
                rawApiKey,
                req.method,
                req.path,
            );

            // Populate request with authenticated developer context
            req.apiKey = key;
            req.user = {
                id: key.userId,
                email: key.user?.email || 'developer-service@angkorgate.local',
                roles: ['DEVELOPER', 'API_KEY'],
                apiKeyId: key.id,
                isApiKey: true,
                permissions: key.permissions || [],
            };

            return true;
        }

        // 2. Fall back to standard JWT auth
        const result = super.canActivate(context);
        if (result instanceof Promise) {
            return await result;
        }
        if (isObservable(result)) {
            return await lastValueFrom(result);
        }
        return result as boolean;
    }
}
