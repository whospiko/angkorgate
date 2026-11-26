import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class UpdateOidcSettingsDto {
    @ApiPropertyOptional({
        description: 'OIDC Issuer URL (e.g. https://auth.example.com/oidc)',
        example: 'https://auth.example.com/oidc',
    })
    @IsOptional()
    @IsUrl({ require_tld: false, require_protocol: true })
    issuer?: string;

    @ApiPropertyOptional({
        description: 'Console / Login UI base URL where OIDC interactions redirect',
        example: 'https://console.example.com',
    })
    @IsOptional()
    @IsUrl({ require_tld: false, require_protocol: true })
    consoleUrl?: string;
}
