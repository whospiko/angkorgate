import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96 bits for GCM
const TAG_LENGTH = 16;

/**
 * AES-256-GCM encryption for sensitive at-rest data (TOTP secrets).
 *
 * Format of encrypted string: `<iv-hex>:<tag-hex>:<ciphertext-hex>`
 * - IV is unique per encryption (never reuse)
 * - Tag is the GCM authentication tag (detects tampering)
 * - Ciphertext is the encrypted payload
 *
 * Key is loaded from MFA_ENCRYPTION_KEY env (32 bytes hex = 64 chars).
 * Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 */
@Injectable()
export class EncryptionService {
    private readonly logger = new Logger(EncryptionService.name);
    private readonly key: Buffer;

    constructor(config: ConfigService) {
        const keyHex = config.get<string>('MFA_ENCRYPTION_KEY');
        if (!keyHex || keyHex.length !== 64) {
            throw new Error(
                'MFA_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). ' +
                'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
            );
        }
        this.key = Buffer.from(keyHex, 'hex');
    }

    encrypt(plaintext: string): string {
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ALGORITHM, this.key, iv);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decrypt(payload: string): string {
        const parts = payload.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted payload format');
        }
        const [ivHex, tagHex, dataHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const data = Buffer.from(dataHex, 'hex');

        if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
            throw new Error('Invalid IV or tag length');
        }

        const decipher = createDecipheriv(ALGORITHM, this.key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
            decipher.update(data),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
}