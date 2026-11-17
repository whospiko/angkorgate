import { IsString, MinLength } from 'class-validator';

/** Step 1 of setup — user must re-confirm password to start MFA enrollment */
export class SetupMfaDto {
    @IsString()
    @MinLength(1)
    password: string;
}