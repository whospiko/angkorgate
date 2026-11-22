import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateIf,
} from 'class-validator';

export class InitialSetupDto {
    @ApiProperty({ description: 'Primary Super Administrator email address', example: 'admin@angkorgate.local' })
    @IsEmail({}, { message: 'A valid email address is required for administrator' })
    @IsNotEmpty()
    adminEmail: string;

    @ApiProperty({ description: 'Primary Super Administrator password (min 8 characters)', minLength: 8 })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    adminPassword: string;

    @ApiPropertyOptional({ description: 'Confirmation password for client validation' })
    @IsOptional()
    @IsString()
    confirmPassword?: string;

    @ApiPropertyOptional({ description: 'Administrator full display name', example: 'System Administrator' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.adminName))
    @IsString()
    @MaxLength(100)
    adminName?: string;

    @ApiPropertyOptional({ description: 'Administrator phone number', example: '+85512345678' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.adminPhone))
    @IsString()
    @MaxLength(20)
    adminPhone?: string;

    // Branding / Content Management fields
    @ApiProperty({ description: 'Application display name', example: 'AngkorGate' })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(100)
    appName: string;

    @ApiPropertyOptional({ description: 'Application tagline / subtitle', example: 'Enterprise Identity & Access Management' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.appDescription))
    @IsString()
    @MaxLength(255)
    appDescription?: string;

    @ApiPropertyOptional({ description: 'Application Logo image URL or data URI' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.logoUrl))
    @IsString()
    logoUrl?: string;

    @ApiPropertyOptional({ description: 'Application Favicon image URL or data URI' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.faviconUrl))
    @IsString()
    faviconUrl?: string;

    @ApiPropertyOptional({ description: 'Organization or Company name', example: 'AngkorGate Team' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.organizationName))
    @IsString()
    @MaxLength(150)
    organizationName?: string;

    @ApiPropertyOptional({ description: 'Support email address', example: 'support@angkorgate.local' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.supportEmail))
    @IsEmail({}, { message: 'Please provide a valid support email address' })
    supportEmail?: string;

    @ApiPropertyOptional({ description: 'Footer copyright or note', example: '© 2026 AngkorGate Open Source' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.footerText))
    @IsString()
    @MaxLength(255)
    footerText?: string;
}
