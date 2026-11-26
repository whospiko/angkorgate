import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AuthResponseDto } from '../../auth/dto/auth-response.dto';

export class OauthResponseDto extends AuthResponseDto {
    @ApiProperty({ description: 'OAuth provider code', example: 'github' })
    provider: string;
}

export class OauthTicketResponseDto {
    @ApiProperty({ description: 'JWT access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string;

    @ApiProperty({ description: 'JWT refresh token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    refreshToken: string;

    @ApiProperty({ description: 'User ID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    userId: string;

    @ApiProperty({ description: 'OAuth provider code', example: 'github' })
    provider: string;
}

export class OauthLinkStartDto {
    @ApiPropertyOptional({
        description: 'Redirect URL to return the user to after linking completes',
        example: 'https://app.example.com/settings/security',
    })
    @IsOptional()
    @IsString()
    redirect?: string;
}

export class OauthLinkStartResponseDto {
    @ApiProperty({ description: 'Short-lived state token bound to user session' })
    state: string;

    @ApiProperty({ description: 'Relative URL to authorize linking with the provider' })
    authorizeUrl: string;
}

export class AvailableProviderDto {
    @ApiProperty({ description: 'Provider code', example: 'github' })
    code: string;

    @ApiProperty({ description: 'Provider display name', example: 'GitHub' })
    name: string;
}

export class ListProvidersResponseDto {
    @ApiProperty({ description: 'List of available OAuth providers', type: [AvailableProviderDto] })
    providers: AvailableProviderDto[];
}
