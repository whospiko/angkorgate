import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemConfig } from '../entities/system-config.entity';

export class BrandingResponseDto {
    @ApiProperty({ description: 'Application display name', example: 'AngkorGate' })
    appName: string;

    @ApiPropertyOptional({ description: 'Application tagline or subtitle' })
    appDescription?: string | null;

    @ApiPropertyOptional({ description: 'Application logo image URL or data URI' })
    logoUrl?: string | null;

    @ApiPropertyOptional({ description: 'Application favicon URL or data URI' })
    faviconUrl?: string | null;

    @ApiPropertyOptional({ description: 'Organization name' })
    organizationName?: string | null;

    @ApiPropertyOptional({ description: 'Support email' })
    supportEmail?: string | null;

    @ApiPropertyOptional({ description: 'Footer copyright or credit text' })
    footerText?: string | null;

    static fromEntity(config: SystemConfig): BrandingResponseDto {
        return {
            appName: config.appName,
            appDescription: config.appDescription ?? null,
            logoUrl: config.logoUrl ?? null,
            faviconUrl: config.faviconUrl ?? null,
            organizationName: config.organizationName ?? null,
            supportEmail: config.supportEmail ?? null,
            footerText: config.footerText ?? null,
        };
    }
}
