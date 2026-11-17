import { IsString, MinLength } from 'class-validator';

/** Disabling MFA requires BOTH password and a current TOTP/backup code */
export class DisableMfaDto {
    @IsString()
    @MinLength(1)
    password: string;

    @IsString()
    @MinLength(6)
    code: string; // TOTP (6 digits) OR backup code (10 chars)
}