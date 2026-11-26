import type { Request } from 'express';
import { LoginContext } from '../services/auth.service';

/**
 * Normalizes an IP string (extracts first entry from comma lists and strips IPv4-mapped IPv6 prefix).
 */
export function normalizeClientIp(rawIp?: string | null): string | undefined {
    if (!rawIp) return undefined;
    const first = rawIp.split(',')[0]?.trim();
    if (!first) return undefined;
    if (first.startsWith('::ffff:')) {
        return first.slice(7);
    }
    return first;
}

/**
 * Extracts IP address and user-agent from Express request into LoginContext.
 */
export function extractClientContext(req: Request): LoginContext {
    const forwardedFor = req.headers['x-forwarded-for']?.toString();
    const realIp = req.headers['x-real-ip']?.toString();
    const ip =
        normalizeClientIp(forwardedFor) ??
        normalizeClientIp(realIp) ??
        normalizeClientIp(req.ip) ??
        normalizeClientIp(req.socket?.remoteAddress);

    return {
        ip,
        userAgent: req.headers['user-agent']?.toString(),
    };
}
