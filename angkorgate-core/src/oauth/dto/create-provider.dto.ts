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
import { SUPPORTED_PROVIDER_CODES } from '../oauth-providers.constants';

export { SUPPORTED_PROVIDER_CODES };

export class CreateProviderDto {
    @ApiProperty({
        description: 'Unique provider code',
        enum: SUPPORTED_PROVIDER_CODES,
        example: 'github',
    })
    @IsString()
    @IsIn(SUPPORTED_PROVIDER_CODES, {
        message: `code must be one of: ${SUPPORTED_PROVIDER_CODES.join(', ')}`,
    })
    code: string;

    @ApiProperty({
        description: 'Display name of the OAuth provider',
        example: 'GitHub',
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
        description: 'Client ID (or Telegram Bot Username/ID) provided by the identity provider',
        example: 'Ov23liAbCdEfGhIjKlMn',
    })
    @IsString()
    @Matches(/^[^\s]+$/, { message: 'clientId must not contain whitespace' })
    clientId: string;

    @ApiPropertyOptional({
        description: 'Client secret (or Telegram Bot Token) provided by the identity provider',
        example: 'super-secret-value',
    })
    @IsOptional()
    @IsString()
    clientSecret?: string;

    @ApiPropertyOptional({
        description: 'Space-delimited OAuth scopes to request from the identity provider',
        example: 'read:user user:email',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    scopes?: string;

    @ApiPropertyOptional({
        description: 'Provider-specific configuration (e.g. Microsoft tenantId, Telegram botUsername, Apple teamId/keyId/privateKey)',
        example: { tenantId: 'common' },
    })
    @IsOptional()
    @IsObject()
    extraConfig?: Record<string, unknown>;
}
