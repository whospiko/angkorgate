import { createHash, randomBytes } from 'crypto';

/**
 * Computes SHA-256 hex digest for a string or buffer.
 */
export function hashSha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a URL-safe base64-encoded random token.
 */
export function generateSecureToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
}

/**
 * Generates a random hexadecimal token.
 */
export function generateHexSecret(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
}

/**
 * Generates a fixed-length numeric one-time password / code.
 */
export function generateNumericOtp(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
}
