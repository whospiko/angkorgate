import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppsService } from '../apps.service';

/**
 * Resolves the caller's app from X-App-Code header (or Origin).
 * Attaches `req.appContext` — used by auth & oauth services.
 *
 * If you only have one app for now, this middleware is a no-op
 * (returns null) and everything falls back to "global behavior".
 */
@Injectable()
export class AppContextMiddleware implements NestMiddleware {
    constructor(private readonly apps: AppsService) { }

    async use(req: Request, _res: Response, next: NextFunction) {
        const appCode =
            (req.headers['x-app-code'] as string | undefined) ??
            (req.headers['origin'] as string | undefined); // fallback: origin as code

        (req as any).appContext = appCode
            ? await this.apps.getContext(appCode)
            : null;
        (req as any).appCode = appCode ?? null;
        next();
    }
}