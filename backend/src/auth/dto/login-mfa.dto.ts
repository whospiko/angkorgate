import { IsOptional, IsString, Length, MinLength } from 'class-validator';

/**
 * Second login step — user submits TOTP code along with the mfaToken
 * returned from the first login step (either as Bearer token in Authorization header
 * or in the request body).
 */
export class LoginMfaDto {
    @IsOptional()
    @IsString()
    @MinLength(10)
    mfaToken?: string;

    @IsString()
    @Length(6, 12)
    code: string; // 6-digit TOTP OR backup code
}