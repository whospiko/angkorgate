export const SUPPORTED_PROVIDER_CODES = [
    'google',
    'github',
    'discord',
    'microsoft',
    'telegram',
    'apple',
] as const;

export type SupportedProviderCode = (typeof SUPPORTED_PROVIDER_CODES)[number];

export interface ProviderDefaults {
    code: SupportedProviderCode;
    displayName: string;
    defaultScopes: string;
    requiresClientSecret: boolean;
}

export const PROVIDER_DEFAULTS: Record<SupportedProviderCode, ProviderDefaults> = {
    google: {
        code: 'google',
        displayName: 'Google',
        defaultScopes: 'email profile',
        requiresClientSecret: true,
    },
    github: {
        code: 'github',
        displayName: 'GitHub',
        defaultScopes: 'read:user user:email',
        requiresClientSecret: true,
    },
    discord: {
        code: 'discord',
        displayName: 'Discord',
        defaultScopes: 'identify email',
        requiresClientSecret: true,
    },
    microsoft: {
        code: 'microsoft',
        displayName: 'Microsoft Entra ID',
        defaultScopes: 'openid profile email User.Read',
        requiresClientSecret: true,
    },
    telegram: {
        code: 'telegram',
        displayName: 'Telegram',
        defaultScopes: '',
        requiresClientSecret: true,
    },
    apple: {
        code: 'apple',
        displayName: 'Apple',
        defaultScopes: 'name email',
        requiresClientSecret: false,
    },
};

export function isSupportedProviderCode(code: string): code is SupportedProviderCode {
    return (SUPPORTED_PROVIDER_CODES as readonly string[]).includes(code);
}

export function parseProviderScopes(
    scopes: string | null | undefined,
    fallback: string,
): string[] {
    const raw = (scopes ?? '').trim() || fallback;
    if (!raw) return [];
    return raw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}
