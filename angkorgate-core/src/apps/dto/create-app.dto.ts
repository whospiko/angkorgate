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

import { SUPPORTED_PROVIDER_CODES } from '../../oauth/oauth-providers.constants';

export const KNOWN_OAUTH_PROVIDERS = SUPPORTED_PROVIDER_CODES;

export class CreateAppDto {
    @ApiProperty({
        description: 'Unique lowercase kebab-case code for the application (Client ID)',
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
        description: 'Application description',
        example: 'Electronic health records and appointment portal',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @ApiPropertyOptional({
        description: 'Client secret for confidential OIDC clients. Omit for public clients with PKCE.',
        example: 'my-super-secret-client-key-32chars',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    clientSecret?: string;

    @ApiPropertyOptional({
        description: 'Root URL of the application',
        example: 'https://clinic.example.com',
    })
    @IsOptional()
    @IsString()
    rootUrl?: string;

    @ApiPropertyOptional({
        description: 'Home/Base URL of the application',
        example: 'https://clinic.example.com/home',
    })
    @IsOptional()
    @IsString()
    homeUrl?: string;

    @ApiPropertyOptional({
        description: 'Allowed OAuth/OIDC redirect URIs',
        example: ['http://localhost:5173/callback', 'https://clinic.example.com/callback'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    validRedirectUris?: string[];

    @ApiPropertyOptional({
        description: 'Post-logout redirect URIs',
        example: ['http://localhost:5173/logged-out', 'https://clinic.example.com/'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    validPostLogoutRedirectUris?: string[];

    @ApiPropertyOptional({
        description: 'Allowed Web Origins for CORS requests',
        example: ['http://localhost:5173', 'https://clinic.example.com'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    webOrigins?: string[];

    @ApiPropertyOptional({
        description: 'Standard Authorization Code Flow enabled',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    standardFlowEnabled?: boolean;

    @ApiPropertyOptional({
        description: 'Implicit Flow enabled (deprecated by OAuth 2.1)',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    implicitFlowEnabled?: boolean;

    @ApiPropertyOptional({
        description: 'Direct Access Grants (Resource Owner Password Credentials) enabled',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    directAccessGrantsEnabled?: boolean;

    @ApiPropertyOptional({
        description: 'Service Accounts (Machine-to-Machine client_credentials) enabled',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    serviceAccountsEnabled?: boolean;

    @ApiPropertyOptional({
        description: 'Require Proof Key for Code Exchange (PKCE)',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    requirePkce?: boolean;

    @ApiPropertyOptional({
        description: 'Whether this is a public client (SPA/Mobile) with no client secret',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isPublicClient?: boolean;

    @ApiPropertyOptional({
        description: 'List of Scope IDs assigned to this client application',
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    scopeIds?: string[];

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
        description: 'Allowed OAuth/OIDC redirect URIs (legacy field, syncs with validRedirectUris)',
        example: ['http://localhost:5173/callback'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allowedRedirectUrls?: string[];
}
