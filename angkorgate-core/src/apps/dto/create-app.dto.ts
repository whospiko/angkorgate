import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const KNOWN_OAUTH_PROVIDERS = ['google', 'apple'] as const;

export class CreateAppDto {
    @ApiProperty({
        description: 'Unique lowercase kebab-case code for the application',
        example: 'clinic-prod',
    })
    @IsString()
    @Matches(/^[a-z][a-z0-9-]{1,49}$/, {
        message: 'appCode must be lowercase, kebab-case, 2–50 chars (e.g. "clinic-prod")',
    })
    appCode: string;

    @ApiProperty({
        description: 'Human-readable name of the application',
        example: 'Clinic Production Portal',
        maxLength: 100,
    })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        description: 'Client secret for confidential OIDC clients. Omit for public clients with PKCE.',
        example: 'my-super-secret-client-key-32chars',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    clientSecret?: string;

    @ApiPropertyOptional({
        description: 'Whether inbound OAuth federation is enabled for this app',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    oauthEnabled?: boolean;

    @ApiPropertyOptional({
        description: 'Enabled social identity providers',
        enum: KNOWN_OAUTH_PROVIDERS,
        isArray: true,
        example: ['google'],
    })
    @IsOptional()
    @IsArray()
    @IsIn(KNOWN_OAUTH_PROVIDERS, { each: true })
    enabledProviders?: string[];

    @ApiPropertyOptional({
        description: 'Whether username/password login is allowed',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    passwordLoginEnabled?: boolean;

    @ApiPropertyOptional({
        description: 'Whether self-registration is allowed for this app',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    registrationEnabled?: boolean;

    @ApiPropertyOptional({
        description: 'Whether email verification is enforced before access',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    emailVerificationRequired?: boolean;

    @ApiPropertyOptional({
        description: 'Allowed OAuth/OIDC redirect URIs',
        example: ['http://localhost:5173/callback', 'https://clinic.app/callback'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    allowedRedirectUrls?: string[];
}
