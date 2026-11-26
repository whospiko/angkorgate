import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    ValidateIf,
} from 'class-validator';

export class RequestMagicLinkDto {
    @ApiProperty({
        description: 'Email address to send the one-click magic sign-in link to',
        example: 'user@example.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiPropertyOptional({
        description: 'Optional relative path to redirect after sign-in (e.g. /account)',
        example: '/account',
    })
    @IsOptional()
    @IsString()
    @MaxLength(512)
    redirectUrl?: string;
}

export class VerifyMagicLinkDto {
    @ApiProperty({
        description: 'Signed magic link token from the email URL',
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}

export class RequestOtpDto {
    @ApiProperty({
        description: 'Delivery channel for the 6-digit OTP',
        enum: ['email', 'sms'],
        example: 'email',
    })
    @IsIn(['email', 'sms'])
    channel: 'email' | 'sms';

    @ApiPropertyOptional({
        description: 'Email address (required when channel is "email")',
        example: 'user@example.com',
    })
    @ValidateIf((o: RequestOtpDto) => o.channel === 'email')
    @IsEmail()
    @IsNotEmpty()
    email?: string;

    @ApiPropertyOptional({
        description: 'E.164 phone number (required when channel is "sms")',
        example: '+85512345678',
    })
    @ValidateIf((o: RequestOtpDto) => o.channel === 'sms')
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{6,14}$/, {
        message: 'Phone number must be a valid international format (e.g. +85512345678)',
    })
    phone?: string;
}

export class VerifyOtpDto {
    @ApiProperty({
        description: 'Delivery channel used for the OTP',
        enum: ['email', 'sms'],
        example: 'email',
    })
    @IsIn(['email', 'sms'])
    channel: 'email' | 'sms';

    @ApiPropertyOptional({
        description: 'Email address (required when channel is "email")',
        example: 'user@example.com',
    })
    @ValidateIf((o: VerifyOtpDto) => o.channel === 'email')
    @IsEmail()
    @IsNotEmpty()
    email?: string;

    @ApiPropertyOptional({
        description: 'E.164 phone number (required when channel is "sms")',
        example: '+85512345678',
    })
    @ValidateIf((o: VerifyOtpDto) => o.channel === 'sms')
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{6,14}$/, {
        message: 'Phone number must be a valid international format (e.g. +85512345678)',
    })
    phone?: string;

    @ApiProperty({
        description: '6-digit numeric one-time passcode',
        example: '482910',
    })
    @IsString()
    @Matches(/^\d{6}$/, { message: 'OTP code must be exactly 6 digits' })
    code: string;
}

export class PasswordlessRequestResponseDto {
    @ApiProperty({
        description: 'Generic confirmation message',
        example: 'If an account matches that contact, a sign-in link has been sent.',
    })
    message: string;

    @ApiProperty({
        description: 'Delivery channel used',
        example: 'magic_link',
    })
    channel: 'magic_link' | 'email_otp' | 'sms_otp';

    @ApiProperty({
        description: 'Expiration window in seconds',
        example: 900,
    })
    expiresInSeconds: number;
}
