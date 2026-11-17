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

export const KNOWN_OAUTH_PROVIDERS = ['google', 'apple'] as const;

export class CreateAppDto {
    @IsString()
    @Matches(/^[a-z][a-z0-9-]{1,49}$/, {
        message: 'appCode must be lowercase, kebab-case, 2–50 chars (e.g. "clinic-prod")',
    })
    appCode: string;

    @IsString()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsBoolean()
    oauthEnabled?: boolean;

    @IsOptional()
    @IsArray()
    @IsIn(KNOWN_OAUTH_PROVIDERS, { each: true })
    enabledProviders?: string[];

    @IsOptional()
    @IsBoolean()
    passwordLoginEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    registrationEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    emailVerificationRequired?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    allowedRedirectUrls?: string[];
}