import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express';
import { RuntimeConfigService } from '../services/runtime-config.service';

/**
 * Blocks public registration and OAuth/OIDC flows with HTTP 503 when
 * MAINTENANCE_MODE is enabled, while preserving admin Console, login,
 * and /system/* endpoints so operators can manage or disable maintenance mode.
 */
@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
    constructor(private readonly runtimeConfig: RuntimeConfigService) {}

    use(req: Request, res: Response, next: NextFunction) {
        if (!this.runtimeConfig.getBoolean('MAINTENANCE_MODE', false)) {
            return next();
        }

        const path = req.path || req.originalUrl || '';
        const blockedPrefixes = ['/auth/register', '/oauth', '/oidc'];
        const isBlocked = blockedPrefixes.some(
            (prefix) => path === prefix || path.startsWith(`${prefix}/`),
        );

        if (isBlocked) {
            return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                message: 'System is currently in maintenance mode. Please try again later.',
                error: 'Service Unavailable',
            });
        }

        return next();
    }
}
