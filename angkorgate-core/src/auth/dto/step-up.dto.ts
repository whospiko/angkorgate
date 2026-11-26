import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export type StepUpVerificationMethod = 'password' | 'totp' | 'email_otp' | 'passkey';

export class StepUpVerifyDto {
    @ApiProperty({ enum: ['password', 'totp', 'email_otp'] })
    @IsIn(['password', 'totp', 'email_otp'])
    method: 'password' | 'totp' | 'email_otp';

    @ApiPropertyOptional({ description: 'Account password when method is password' })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiPropertyOptional({ description: '6-digit TOTP / backup code or email OTP when method is totp or email_otp' })
    @IsOptional()
    @IsString()
    code?: string;
}

export class StepUpPasskeyVerifyDto {
    @ApiProperty({ description: 'Challenge ID returned by POST /auth/step-up/passkey/options' })
    @IsString()
    @IsNotEmpty()
    challengeId: string;

    @ApiProperty({ description: 'WebAuthn AuthenticationResponseJSON payload' })
    @IsObject()
    response: Record<string, unknown>;
}
