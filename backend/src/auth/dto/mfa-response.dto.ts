import { AuthResponseDto } from './auth-response.dto';

export class MfaSetupResponseDto {
    /** Base32 secret — show to user as fallback if QR fails */
    secret: string;

    /** otpauth:// URL to render as QR code */
    otpauthUrl: string;

    /** Data-URL PNG for direct <img src> embedding */
    qrCodeDataUrl: string;

    /** One-time backup codes — user MUST save these. Shown once. */
    backupCodes: string[];
}

export class MfaStatusDto {
    isEnabled: boolean;
    enabledAt: Date | null;
    lastUsedAt: Date | null;
    remainingBackupCodes: number;
}

export class MfaLoginChallengeDto {
    mfaRequired: true;
    /** Short-lived JWT (5min) proving password step succeeded */
    mfaToken: string;
    /** How many backup codes remain (so UI can warn if 0) */
    backupCodesRemaining: number;
}

export class MfaLoginSuccessDto extends AuthResponseDto {
    mfaUsed: 'totp' | 'backup_code';
    backupCodesRemaining: number;
}

export class RegenerateBackupCodesResponseDto {
    backupCodes: string[];
}