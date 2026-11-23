import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateIf,
} from 'class-validator';

export class UpdateBrandingDto {
    @ApiPropertyOptional({ description: 'Application display name', example: 'AngkorGate' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.appName))
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    appName?: string;

    @ApiPropertyOptional({ description: 'Application tagline or subtitle' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.appDescription))
    @IsString()
    @MaxLength(255)
    appDescription?: string;

    @ApiPropertyOptional({ description: 'Application logo image URL or base64 data URI' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.logoUrl))
    @IsString()
    logoUrl?: string;

    @ApiPropertyOptional({ description: 'Application favicon URL or base64 data URI' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.faviconUrl))
    @IsString()
    faviconUrl?: string;

    @ApiPropertyOptional({ description: 'Organization or Company name' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.organizationName))
    @IsString()
    @MaxLength(150)
    organizationName?: string;

    @ApiPropertyOptional({ description: 'Support contact email' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.supportEmail))
    @IsEmail({}, { message: 'Please provide a valid support email address' })
    supportEmail?: string;

    @ApiPropertyOptional({ description: 'Footer copyright or credit text' })
    @IsOptional()
    @ValidateIf((o) => Boolean(o.footerText))
    @IsString()
    @MaxLength(255)
    footerText?: string;

    @ApiPropertyOptional({ description: 'Allowed role codes permitted to access the administrative dashboard', example: ['ADMIN'], isArray: true })
    @IsOptional()
    @IsString({ each: true })
    allowedDashboardRoles?: string[];
}
