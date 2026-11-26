import {
    BadRequestException,
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { RuntimeSetting } from '../entities/runtime-setting.entity';
import {
    RUNTIME_SETTING_DEFINITIONS,
    RUNTIME_SETTING_MAP,
    RuntimeSettingCategory,
    RuntimeSettingInputType,
} from '../runtime-config.constants';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SECRET_MASK = '••••••••';

export interface RuntimeSettingView {
    key: string;
    category: RuntimeSettingCategory;
    label: string;
    description: string;
    inputType: RuntimeSettingInputType;
    options?: string[];
    isSecret: boolean;
    hasSecret: boolean;
    value: string;
    defaultValue: string;
    placeholder?: string;
    source: 'database' | 'env' | 'default';
    updatedAt?: string;
}

@Injectable()
export class RuntimeConfigService implements OnModuleInit {
    private readonly logger = new Logger(RuntimeConfigService.name);
    private readonly cache = new Map<string, { value: string; updatedAt: Date }>();
    private readonly encryptionKey: Buffer;

    constructor(
        @InjectRepository(RuntimeSetting)
        private readonly repo: Repository<RuntimeSetting>,
        private readonly config: ConfigService,
    ) {
        const mfaHex = this.config.get<string>('MFA_ENCRYPTION_KEY');
        if (mfaHex && /^[0-9a-fA-F]{64}$/.test(mfaHex)) {
            this.encryptionKey = Buffer.from(mfaHex, 'hex');
        } else {
            const secret =
                this.config.get<string>('JWT_ACCESS_SECRET') ??
                'angkorgate-dev-runtime-config-fallback-key';
            this.encryptionKey = createHash('sha256').update(secret).digest();
        }
    }

    async onModuleInit(): Promise<void> {
        await this.reload();
    }

    async reload(): Promise<void> {
        try {
            const rows = await this.repo.find();
            this.cache.clear();
            for (const row of rows) {
                if (row.value === null || row.value === undefined) continue;
                try {
                    const plain = row.isSecret ? this.decrypt(row.value) : row.value;
                    this.cache.set(row.key, { value: plain, updatedAt: row.updatedAt });
                } catch (err) {
                    this.logger.warn(`Failed to decrypt runtime setting "${row.key}": ${(err as Error).message}`);
                }
            }
        } catch (err) {
            // Table may not exist yet during early migration bootstrap
            this.logger.debug(`Runtime settings preload skipped: ${(err as Error).message}`);
        }
    }

    get(key: string, fallback?: string): string | undefined {
        const cached = this.cache.get(key);
        if (cached !== undefined && cached.value !== '') {
            return cached.value;
        }
        const envVal = process.env[key] ?? this.config.get<string>(key);
        if (envVal !== undefined && envVal !== '') {
            return String(envVal);
        }
        const def = RUNTIME_SETTING_MAP.get(key);
        if (fallback !== undefined) return fallback;
        return def?.defaultValue;
    }

    getNumber(key: string, fallback: number): number {
        const raw = this.get(key);
        if (raw === undefined || raw === '') return fallback;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    getBoolean(key: string, fallback: boolean): boolean {
        const raw = this.get(key);
        if (raw === undefined || raw === '') return fallback;
        return raw.toLowerCase() === 'true' || raw === '1';
    }

    async getAllMasked(): Promise<RuntimeSettingView[]> {
        await this.reload();

        return RUNTIME_SETTING_DEFINITIONS.map((def) => {
            const dbEntry = this.cache.get(def.key);
            const envVal = process.env[def.key];

            let source: 'database' | 'env' | 'default' = 'default';
            let resolved = def.defaultValue;

            if (dbEntry !== undefined && dbEntry.value !== '') {
                source = 'database';
                resolved = dbEntry.value;
            } else if (envVal !== undefined && envVal !== '') {
                source = 'env';
                resolved = envVal;
            }

            const isSecret = Boolean(def.isSecret);
            const hasSecret = isSecret && resolved.length > 0;

            return {
                key: def.key,
                category: def.category,
                label: def.label,
                description: def.description,
                inputType: def.inputType,
                options: def.options,
                isSecret,
                hasSecret,
                value: isSecret ? (hasSecret ? SECRET_MASK : '') : resolved,
                defaultValue: def.defaultValue,
                placeholder: def.placeholder,
                source,
                updatedAt: dbEntry?.updatedAt?.toISOString(),
            };
        });
    }

    async updateSettings(
        updates: Record<string, string | number | boolean | null>,
        actorId: string,
    ): Promise<RuntimeSettingView[]> {
        const entries = Object.entries(updates);
        if (entries.length === 0) {
            throw new BadRequestException('No settings provided to update.');
        }

        for (const [key, rawVal] of entries) {
            const def = RUNTIME_SETTING_MAP.get(key);
            if (!def) {
                throw new BadRequestException(`Unknown runtime setting key: "${key}"`);
            }

            // Null resets the DB override back to env/default
            if (rawVal === null) {
                await this.repo.delete({ key });
                this.cache.delete(key);
                continue;
            }

            const strVal = String(rawVal).trim();

            // For secrets, ignore empty string or mask placeholder so existing secret is preserved
            if (def.isSecret && (strVal === '' || strVal === SECRET_MASK)) {
                continue;
            }

            if (def.inputType === 'number' && strVal !== '' && !Number.isFinite(Number(strVal))) {
                throw new BadRequestException(`Setting "${key}" must be a valid number.`);
            }

            if (def.inputType === 'select' && def.options && !def.options.includes(strVal)) {
                throw new BadRequestException(
                    `Setting "${key}" must be one of: ${def.options.join(', ')}`,
                );
            }

            const storedValue = def.isSecret ? this.encrypt(strVal) : strVal;

            await this.repo.save(
                this.repo.create({
                    key,
                    value: storedValue,
                    category: def.category,
                    isSecret: Boolean(def.isSecret),
                    updatedBy: actorId,
                }),
            );

            this.cache.set(key, { value: strVal, updatedAt: new Date() });
        }

        return this.getAllMasked();
    }

    async revealSecret(key: string): Promise<{ key: string; value: string }> {
        const def = RUNTIME_SETTING_MAP.get(key);
        if (!def) {
            throw new BadRequestException(`Unknown runtime setting key: "${key}"`);
        }
        if (!def.isSecret) {
            throw new BadRequestException(`Setting "${key}" is not a secret.`);
        }
        await this.reload();
        const value = this.get(key, '') ?? '';
        return { key, value };
    }

    private encrypt(plaintext: string): string {
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    private decrypt(payload: string): string {
        const parts = payload.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted payload');
        }
        const [ivHex, tagHex, dataHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const data = Buffer.from(dataHex, 'hex');
        if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
            throw new Error('Invalid IV or tag length');
        }
        const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    }
}
