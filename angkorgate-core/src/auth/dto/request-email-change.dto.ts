import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RequestEmailChangeDto {
    @IsEmail()
    newEmail: string;

    /**
     * Required IF the user has MFA enabled. We need proof it's really them.
     * Ignored (optional) if MFA is not enabled for the account.
     */
    @IsOptional()
    @IsString()
    @MinLength(6)
    mfaCode?: string;
}