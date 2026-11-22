import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RequestEmailChangeDto {
    @ApiProperty({
        description: 'New target email address for the account',
        example: 'new.email@example.com',
    })
    @IsEmail()
    newEmail: string;

    @ApiPropertyOptional({
        description: 'Current MFA code (TOTP or backup code). Required if user has MFA enabled.',
        example: '123456',
        minLength: 6,
    })
    @IsOptional()
    @IsString()
    @MinLength(6)
    mfaCode?: string;
}
