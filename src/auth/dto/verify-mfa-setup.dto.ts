import { IsString, Length, Matches } from 'class-validator';

/** Step 2 — user provides a 6-digit code from their authenticator app */
export class VerifyMfaSetupDto {
    @IsString()
    @Length(6, 6, { message: 'code must be 6 digits' })
    @Matches(/^\d{6}$/, { message: 'code must be numeric' })
    code: string;
}