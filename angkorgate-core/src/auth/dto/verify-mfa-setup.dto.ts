import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Step 2 — user provides a 6-digit code from their authenticator app */
export class VerifyMfaSetupDto {
    @ApiProperty({
        description: '6-digit time-based code from the authenticator app',
        example: '123456',
    })
    @IsString()
    @Length(6, 6, { message: 'code must be 6 digits' })
    @Matches(/^\d{6}$/, { message: 'code must be numeric' })
    code: string;
}
