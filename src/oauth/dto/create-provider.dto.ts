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
    @IsString()
    @IsIn(SUPPORTED_PROVIDER_CODES, {
        message: `code must be one of: ${SUPPORTED_PROVIDER_CODES.join(', ')}`,
    })
    code: string;

    @IsString()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsString()
    @Matches(/^[^\s]+$/, { message: 'clientId must not contain whitespace' })
    clientId: string;

    @IsOptional()
    @IsString()
    clientSecret?: string; // not required for Apple (JWT-generated)

    @IsOptional()
    @IsString()
    @MaxLength(255)
    scopes?: string;

    @IsOptional()
    @IsObject()
    extraConfig?: Record<string, unknown>; // Apple teamId/keyId/privateKey
}