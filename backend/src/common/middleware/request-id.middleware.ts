import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request & { requestId?: string; startTime?: number }, res: Response, next: NextFunction) {
        const incoming = req.headers['x-request-id'];
        req.requestId =
            (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
        req.startTime = Date.now();

        // Echo back so clients can correlate
        res.setHeader('X-Request-Id', req.requestId);
        next();
    }
}