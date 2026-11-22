import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
    @ApiProperty({ description: 'Session ID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    id: string;

    @ApiPropertyOptional({ description: 'User-Agent header of client session', example: 'Mozilla/5.0...' })
    userAgent?: string;

    @ApiPropertyOptional({ description: 'IP address of client session', example: '127.0.0.1' })
    ipAddress?: string;

    @ApiProperty({ description: 'Session creation timestamp', example: '2026-11-21T10:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ description: 'Session expiration timestamp', example: '2026-11-28T10:00:00.000Z' })
    expiresAt: Date;

    @ApiProperty({ description: 'Indicates whether this session matches the current client token', example: true })
    isCurrent: boolean;
}

export class ListSessionsQueryDto {
    @ApiPropertyOptional({ description: 'Current refresh token to identify the caller session in results' })
    currentRefreshToken?: string;
}
