import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateOauthSettingsDto {
    @ApiPropertyOptional({
        description: 'Master switch enabling or disabling federated OAuth login globally',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    oauthEnabled?: boolean;

    @ApiPropertyOptional({
        description: 'Public base URL of AngkorGate Core used to build OAuth callback URLs (leave empty to auto-detect from request host)',
        example: 'https://auth.example.com',
    })
    @IsOptional()
    @IsString()
    callbackBaseUrl?: string;

    @ApiPropertyOptional({
        description: 'Default Console / Web application URL for post-login redirects',
        example: 'https://console.example.com',
    })
    @IsOptional()
    @IsUrl({ require_tld: false, require_protocol: true })
    webUrl?: string;
}
