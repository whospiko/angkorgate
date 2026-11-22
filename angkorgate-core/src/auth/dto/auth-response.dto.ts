import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryDto {
    @ApiProperty({ description: 'User ID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    id: string;

    @ApiProperty({ description: 'User email address', example: 'user@example.com', nullable: true })
    email: string | null;

    @ApiProperty({ description: 'User phone number', example: '+85512345678', nullable: true })
    phone: string | null;

    @ApiProperty({ description: 'Assigned role names', example: ['admin', 'customer'] })
    roles: string[];

    @ApiProperty({ description: 'Indicates whether the user must change password on next login', example: false })
    mustChangePassword: boolean;
}

export class AuthResponseDto {
    @ApiProperty({ description: 'JWT access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string;

    @ApiProperty({ description: 'JWT refresh token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    refreshToken: string;

    @ApiProperty({ description: 'Access token expiration time in seconds', example: 900 })
    accessTokenExpiresIn: number;

    @ApiProperty({ description: 'Refresh token expiration time in seconds', example: 604800 })
    refreshTokenExpiresIn: number;

    @ApiProperty({ description: 'User profile summary', type: () => UserSummaryDto })
    user: UserSummaryDto;
}

export class MfaChallengeDto {
    @ApiProperty({ description: 'Flag indicating MFA challenge is required', example: true })
    mfaRequired: true;

    @ApiProperty({ description: 'Short-lived MFA verification token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    mfaToken: string;

    @ApiProperty({ description: 'Number of backup codes remaining', example: 10 })
    backupCodesRemaining: number;
}

export type LoginResponseDto = AuthResponseDto | MfaChallengeDto;
