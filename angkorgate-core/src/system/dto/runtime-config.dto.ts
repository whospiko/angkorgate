import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsString, Matches } from 'class-validator';

export class UpdateRuntimeConfigDto {
    @ApiProperty({
        description: 'Map of runtime setting keys to values (pass null to reset a key back to .env/default)',
        example: {
            MAIL_PROVIDER: 'smtp',
            MAIL_HOST: 'smtp.example.com',
            MAIL_PORT: 587,
            PASSWORDLESS_AUTO_REGISTER: true,
        },
    })
    @IsObject()
    settings: Record<string, string | number | boolean | null>;
}

export class TestMailConfigDto {
    @ApiProperty({
        description: 'Recipient email address for the test email',
        example: 'admin@angkorgate.local',
    })
    @IsEmail()
    @IsNotEmpty()
    to: string;
}

export class TestSmsConfigDto {
    @ApiProperty({
        description: 'Recipient phone number in E.164 format for the test SMS',
        example: '+85512345678',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{6,14}$/, {
        message: 'Phone number must be a valid international format (e.g. +85512345678)',
    })
    to: string;
}
