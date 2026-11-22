import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthResponseDto } from './auth-response.dto';

export class MfaSetupResponseDto {
    @ApiProperty({
        description: 'Base32 TOTP secret key — show to user as manual fallback if QR fails',
        example: 'JBSWY3DPEHPK3PXP',
    })
    secret: string;

    @ApiProperty({
        description: 'Standard otpauth:// URI to render as QR code in authenticator app',
        example: 'otpauth://totp/AngkorGate:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AngkorGate',
    })
    otpauthUrl: string;

    @ApiProperty({
        description: 'Data URL PNG string for direct <img src> rendering',
        example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    })
    qrCodeDataUrl: string;

    @ApiProperty({
        description: 'One-time backup codes — user MUST save these securely (shown once)',
        example: ['a1b2c3d4e5', 'f6g7h8i9j0'],
        type: [String],
    })
    backupCodes: string[];
}

export class MfaStatusDto {
    @ApiProperty({ description: 'Indicates whether MFA is currently enabled', example: true })
    isEnabled: boolean;

    @ApiPropertyOptional({ description: 'Timestamp when MFA was enabled', example: '2026-11-21T10:00:00.000Z', nullable: true })
    enabledAt: Date | null;

    @ApiPropertyOptional({ description: 'Timestamp when MFA was last used', example: '2026-11-21T12:00:00.000Z', nullable: true })
    lastUsedAt: Date | null;

    @ApiProperty({ description: 'Number of unused backup codes remaining', example: 8 })
    remainingBackupCodes: number;
}

export class MfaLoginChallengeDto {
    @ApiProperty({ description: 'Flag indicating MFA challenge is required', example: true })
    mfaRequired: true;

    @ApiProperty({ description: 'Short-lived token (5 min) proving initial password verification', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    mfaToken: string;

    @ApiProperty({ description: 'How many backup codes remain', example: 8 })
    backupCodesRemaining: number;
}

export class MfaLoginSuccessDto extends AuthResponseDto {
    @ApiProperty({ description: 'Type of MFA method used for verification', enum: ['totp', 'backup_code'], example: 'totp' })
    mfaUsed: 'totp' | 'backup_code';

    @ApiProperty({ description: 'How many backup codes remain', example: 8 })
    backupCodesRemaining: number;
}

export class RegenerateBackupCodesResponseDto {
    @ApiProperty({
        description: 'New set of one-time emergency backup codes',
        example: ['k1l2m3n4o5', 'p6q7r8s9t0'],
        type: [String],
    })
    backupCodes: string[];
}
