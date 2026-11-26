import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import type { DeviceType } from '../utils/user-agent.util';

export class SessionResponseDto {
    @ApiProperty({ description: 'Session ID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    id: string;

    @ApiProperty({ description: 'Refresh token family ID', example: 'b1ffcd00-1d1c-4ef8-bb6d-6bb9bd380a22' })
    familyId: string;

    @ApiPropertyOptional({ description: 'Raw User-Agent header of client session', example: 'Mozilla/5.0...' })
    userAgent?: string;

    @ApiProperty({ description: 'Parsed browser name and major version', example: 'Chrome 131' })
    browser: string;

    @ApiProperty({ description: 'Parsed operating system name and version', example: 'macOS 10.15' })
    os: string;

    @ApiProperty({
        description: 'Detected device category',
        enum: ['desktop', 'mobile', 'tablet', 'cli', 'bot', 'unknown'],
        example: 'desktop',
    })
    deviceType: DeviceType;

    @ApiPropertyOptional({ description: 'IP address of client session', example: '127.0.0.1' })
    ipAddress?: string;

    @ApiProperty({ description: 'Last activity timestamp of this session family', example: '2026-11-21T10:30:00.000Z' })
    lastActiveAt: Date;

    @ApiProperty({ description: 'Session creation timestamp', example: '2026-11-21T10:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ description: 'Session expiration timestamp', example: '2026-11-28T10:00:00.000Z' })
    expiresAt: Date;

    @ApiProperty({ description: 'Indicates whether this session matches the current client token', example: true })
    isCurrent: boolean;
}

export class ListSessionsQueryDto {
    @ApiPropertyOptional({ description: 'Current refresh token to identify the caller session in results' })
    @IsOptional()
    @IsString()
    currentRefreshToken?: string;
}

export class RevokeOtherSessionsDto {
    @ApiPropertyOptional({ description: 'Current refresh token whose session family should be preserved' })
    @IsOptional()
    @IsString()
    currentRefreshToken?: string;

    @ApiPropertyOptional({ description: 'Session ID to keep active while revoking all other sessions' })
    @IsOptional()
    @IsUUID()
    keepSessionId?: string;
}

export class RevokeSessionsResultDto {
    @ApiProperty({ description: 'Number of sessions revoked', example: 2 })
    revokedCount: number;
}
