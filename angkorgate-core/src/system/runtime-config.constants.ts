export type RuntimeSettingCategory =
    | 'mail'
    | 'sms'
    | 'passwordless'
    | 'webauthn'
    | 'auth'
    | 'system';

export type RuntimeSettingInputType =
    | 'text'
    | 'number'
    | 'password'
    | 'boolean'
    | 'select';

export interface RuntimeSettingDefinition {
    key: string;
    category: RuntimeSettingCategory;
    label: string;
    description: string;
    inputType: RuntimeSettingInputType;
    options?: string[];
    isSecret?: boolean;
    defaultValue: string;
    placeholder?: string;
}

export const RUNTIME_SETTING_DEFINITIONS: RuntimeSettingDefinition[] = [
    // ── Email / SMTP ────────────────────────────────────────────
    {
        key: 'MAIL_PROVIDER',
        category: 'mail',
        label: 'Mail Provider',
        description: 'Use "console" for local log output or "smtp" for real email delivery.',
        inputType: 'select',
        options: ['console', 'smtp'],
        defaultValue: 'console',
    },
    {
        key: 'MAIL_FROM',
        category: 'mail',
        label: 'From Address',
        description: 'Sender email address shown on outgoing verification, magic link, and OTP emails.',
        inputType: 'text',
        defaultValue: 'no-reply@localhost',
        placeholder: 'AngkorGate <no-reply@yourdomain.com>',
    },
    {
        key: 'MAIL_HOST',
        category: 'mail',
        label: 'SMTP Host',
        description: 'Hostname of your SMTP server (e.g. smtp.resend.com, smtp.gmail.com).',
        inputType: 'text',
        defaultValue: '',
        placeholder: 'smtp.example.com',
    },
    {
        key: 'MAIL_PORT',
        category: 'mail',
        label: 'SMTP Port',
        description: 'SMTP port (587 for STARTTLS, 465 for SSL/TLS, 1025 for Mailpit/MailHog).',
        inputType: 'number',
        defaultValue: '587',
    },
    {
        key: 'MAIL_SECURE',
        category: 'mail',
        label: 'SMTP TLS/SSL (Port 465)',
        description: 'Enable implicit TLS (true for port 465, false for STARTTLS on 587).',
        inputType: 'boolean',
        defaultValue: 'false',
    },
    {
        key: 'MAIL_USER',
        category: 'mail',
        label: 'SMTP Username',
        description: 'SMTP authentication username or API key identifier.',
        inputType: 'text',
        defaultValue: '',
        placeholder: 'resend',
    },
    {
        key: 'MAIL_PASS',
        category: 'mail',
        label: 'SMTP Password / API Key',
        description: 'Encrypted at rest in the database. Leave blank to keep existing secret.',
        inputType: 'password',
        isSecret: true,
        defaultValue: '',
    },

    // ── SMS Gateway ─────────────────────────────────────────────
    {
        key: 'SMS_PROVIDER',
        category: 'sms',
        label: 'SMS Provider',
        description: 'Use "console" for dev logs, "twilio" for Twilio API, or "webhook" for a custom HTTP gateway.',
        inputType: 'select',
        options: ['console', 'twilio', 'webhook'],
        defaultValue: 'console',
    },
    {
        key: 'TWILIO_ACCOUNT_SID',
        category: 'sms',
        label: 'Twilio Account SID',
        description: 'Twilio Account SID (required when SMS Provider is "twilio").',
        inputType: 'text',
        defaultValue: '',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
        key: 'TWILIO_AUTH_TOKEN',
        category: 'sms',
        label: 'Twilio Auth Token',
        description: 'Encrypted at rest. Required when SMS Provider is "twilio".',
        inputType: 'password',
        isSecret: true,
        defaultValue: '',
    },
    {
        key: 'TWILIO_FROM_NUMBER',
        category: 'sms',
        label: 'Twilio From Number',
        description: 'Sender phone number in E.164 format (e.g. +14155552671).',
        inputType: 'text',
        defaultValue: '',
        placeholder: '+14155552671',
    },
    {
        key: 'SMS_WEBHOOK_URL',
        category: 'sms',
        label: 'Custom SMS Webhook URL',
        description: 'HTTPS endpoint receiving POST { to, message, timestamp } when SMS Provider is "webhook".',
        inputType: 'text',
        defaultValue: '',
        placeholder: 'https://sms-gateway.internal/send',
    },
    {
        key: 'SMS_WEBHOOK_SECRET',
        category: 'sms',
        label: 'SMS Webhook Secret',
        description: 'Sent in X-SMS-Webhook-Secret header. Encrypted at rest.',
        inputType: 'password',
        isSecret: true,
        defaultValue: '',
    },

    // ── Passwordless (Magic Link & OTP) ─────────────────────────
    {
        key: 'PASSWORDLESS_MAGIC_LINK_ENABLED',
        category: 'passwordless',
        label: 'Enable Magic Link Sign-In',
        description: 'Allow users to sign in via one-click signed email links.',
        inputType: 'boolean',
        defaultValue: 'true',
    },
    {
        key: 'PASSWORDLESS_EMAIL_OTP_ENABLED',
        category: 'passwordless',
        label: 'Enable Email OTP Sign-In',
        description: 'Allow users to sign in via 6-digit numeric codes sent to email.',
        inputType: 'boolean',
        defaultValue: 'true',
    },
    {
        key: 'PASSWORDLESS_SMS_OTP_ENABLED',
        category: 'passwordless',
        label: 'Enable SMS OTP Sign-In',
        description: 'Allow users to sign in via 6-digit numeric codes sent via SMS.',
        inputType: 'boolean',
        defaultValue: 'true',
    },
    {
        key: 'APP_WEB_URL',
        category: 'passwordless',
        label: 'Console / Web Base URL',
        description: 'Public URL used to build Magic Link and email verification URLs.',
        inputType: 'text',
        defaultValue: 'http://localhost:4000',
        placeholder: 'https://auth.yourdomain.com',
    },
    {
        key: 'PASSWORDLESS_AUTO_REGISTER',
        category: 'passwordless',
        label: 'Auto-Register Unknown Users',
        description: 'Automatically provision a CUSTOMER account when an unknown email/phone requests a Magic Link or OTP.',
        inputType: 'boolean',
        defaultValue: 'false',
    },
    {
        key: 'PASSWORDLESS_MAGIC_LINK_TTL_MINUTES',
        category: 'passwordless',
        label: 'Magic Link Expiry (Minutes)',
        description: 'How long a signed Magic Link remains valid.',
        inputType: 'number',
        defaultValue: '15',
    },
    {
        key: 'PASSWORDLESS_OTP_TTL_MINUTES',
        category: 'passwordless',
        label: 'OTP Code Expiry (Minutes)',
        description: 'How long a 6-digit Email or SMS OTP remains valid.',
        inputType: 'number',
        defaultValue: '10',
    },
    {
        key: 'PASSWORDLESS_COOLDOWN_SECONDS',
        category: 'passwordless',
        label: 'Resend Cooldown (Seconds)',
        description: 'Minimum wait time before requesting a new Magic Link or OTP.',
        inputType: 'number',
        defaultValue: '60',
    },
    {
        key: 'PASSWORDLESS_MAX_OTP_ATTEMPTS',
        category: 'passwordless',
        label: 'Max OTP Verification Attempts',
        description: 'Invalidate the OTP after this many wrong guesses.',
        inputType: 'number',
        defaultValue: '5',
    },

    // ── WebAuthn / Passkeys ─────────────────────────────────────
    {
        key: 'WEBAUTHN_ENABLED',
        category: 'webauthn',
        label: 'Enable Passkey / Biometrics Sign-In',
        description: 'Allow users to register and sign in with WebAuthn passkeys (Touch ID, Face ID, Security Keys).',
        inputType: 'boolean',
        defaultValue: 'true',
    },
    {
        key: 'WEBAUTHN_RP_NAME',
        category: 'webauthn',
        label: 'Relying Party Name',
        description: 'Human-readable name shown in browser passkey prompts.',
        inputType: 'text',
        defaultValue: 'AngkorGate',
    },
    {
        key: 'WEBAUTHN_RP_ID',
        category: 'webauthn',
        label: 'Relying Party ID (Domain)',
        description: 'Domain bound to passkey credentials (e.g. localhost or auth.yourdomain.com).',
        inputType: 'text',
        defaultValue: 'localhost',
    },
    {
        key: 'WEBAUTHN_ORIGINS',
        category: 'webauthn',
        label: 'Allowed WebAuthn Origins',
        description: 'Comma-separated list of allowed origins for passkey registration & sign-in.',
        inputType: 'text',
        defaultValue: 'http://localhost:4000,http://localhost:3000,http://localhost:8080',
    },

    // ── Session & JWT TTLs ──────────────────────────────────────
    {
        key: 'JWT_ACCESS_TTL',
        category: 'auth',
        label: 'Access Token TTL (Seconds)',
        description: 'Lifetime of issued JWT access tokens in seconds (default 900 = 15m).',
        inputType: 'number',
        defaultValue: '900',
    },
    {
        key: 'JWT_REFRESH_TTL',
        category: 'auth',
        label: 'Refresh Token TTL (Seconds)',
        description: 'Lifetime of refresh tokens in seconds (default 604800 = 7d).',
        inputType: 'number',
        defaultValue: '604800',
    },

    // ── System & Operations ─────────────────────────────────────
    {
        key: 'MAINTENANCE_MODE',
        category: 'system',
        label: 'Maintenance Mode',
        description: 'Temporarily pause public registration and OAuth/OIDC flows with HTTP 503 while keeping admin Console access active.',
        inputType: 'boolean',
        defaultValue: 'false',
    },
];

export const RUNTIME_SETTING_MAP = new Map<string, RuntimeSettingDefinition>(
    RUNTIME_SETTING_DEFINITIONS.map((def) => [def.key, def]),
);
