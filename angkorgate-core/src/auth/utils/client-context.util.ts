import type { Request } from 'express';
import { LoginContext } from '../services/auth.service';

/**
 * Extracts IP address and user-agent from Express request into LoginContext.
 */
export function extractClientContext(req: Request): LoginContext {
    return {
        ip: req.ip,
        userAgent: req.headers['user-agent']?.toString(),
    };
}
