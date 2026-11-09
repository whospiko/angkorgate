import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class CreateUserDto {
    @ApiPropertyOptional({
        description: 'User email address. Required if phone is not provided.',
        example: 'user@example.com',
    })
    @ValidateIf((o) => !o.phone)
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({
        description: 'User phone number. Required if email is not provided.',
        example: '+1234567890',
        pattern: '^\\+?[0-9]{8,20}$',
    })
    @ValidateIf((o) => !o.email)
    @IsString()
    @Matches(/^\+?[0-9]{8,20}$/, { message: 'phone must be 8–20 digits, optional leading +' })
    phone?: string;

    @ApiProperty({
        description: 'User password',
        example: 'strongPassword123!',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiPropertyOptional({
        description: 'Indicates if the user account is active',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Indicates if the user email has been verified',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isEmailVerified?: boolean;

    @ApiPropertyOptional({
        description: 'Indicates if the user phone has been verified',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isPhoneVerified?: boolean;

    @ApiPropertyOptional({
        description: 'Indicates if the user must change their password on next login',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    mustChangePassword?: boolean;
}