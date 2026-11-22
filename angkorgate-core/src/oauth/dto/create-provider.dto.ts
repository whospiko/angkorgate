import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsIn,
    IsObject,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';

export const SUPPORTED_PROVIDER_CODES = ['google', 'apple'] as const;

export class CreateProviderDto {
    @ApiProperty({
        description: 'Unique provider code',
        enum: SUPPORTED_PROVIDER_CODES,
        example: 'google',
    })
    @IsString()
    @IsIn(SUPPORTED_PROVIDER_CODES, {
        message: `code must be one of: ${SUPPORTED_PROVIDER_CODES.join(', ')}`,
    })
    code: string;

    @ApiProperty({
        description: 'Display name of the OAuth provider',
        example: 'Google OAuth',
        maxLength: 100,
    })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        description: 'Indicates whether the provider is active and enabled for authentication',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: 'Client ID provided by the OAuth identity provider',
        example: '1234567890-abcdefg.apps.googleusercontent.com',
    })
    @IsString()
    @Matches(/^[^\s]+$/, { message: 'clientId must not contain whitespace' })
    clientId: string;

    @ApiPropertyOptional({
        description: 'Client secret provided by the OAuth identity provider (optional for Apple)',
        example: 'GOCSPX-mySecretClientValue123',
    })
    @IsOptional()
    @IsString()
    clientSecret?: string; // not required for Apple (JWT-generated)

    @ApiPropertyOptional({
        description: 'Space-delimited OAuth scopes to request from the identity provider',
        example: 'openid email profile',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    scopes?: string;

    @ApiPropertyOptional({
        description: 'Provider-specific configuration object (e.g. Apple teamId, keyId, privateKey)',
        example: { teamId: 'ABC123XYZ', keyId: 'KEY123XYZ' },
    })
    @IsOptional()
    @IsObject()
    extraConfig?: Record<string, unknown>; // Apple teamId/keyId/privateKey
}
