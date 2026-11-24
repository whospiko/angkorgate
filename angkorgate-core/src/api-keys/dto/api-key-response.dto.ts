import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ description: 'Key prefix for identification, e.g. ag_live_4f9a' })
    keyPrefix: string;

    @ApiProperty({ description: 'Last four characters of secret' })
    lastFour: string;

    @ApiProperty({ description: 'Masked key for display, e.g. ag_live_4f9a••••••••1b2c' })
    maskedKey: string;

    @ApiProperty()
    userId: string;

    @ApiPropertyOptional()
    userEmail?: string;

    @ApiPropertyOptional()
    appCode: string | null;

    @ApiProperty({ enum: ['ACTIVE', 'REVOKED', 'EXPIRED'] })
    status: string;

    @ApiProperty({ type: [String] })
    allowedResources: string[];

    @ApiProperty()
    allowedMethods: Record<string, string[]>;

    @ApiProperty({ type: [String] })
    permissions: string[];

    @ApiProperty()
    fieldProjections: Record<string, string[]>;

    @ApiProperty()
    rateLimit: number;

    @ApiPropertyOptional()
    expiresAt: Date | null;

    @ApiPropertyOptional()
    lastUsedAt: Date | null;

    @ApiProperty()
    totalRequests: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
    @ApiProperty({
        description: 'The raw API key. SHOWN ONCE UPON CREATION ONLY! Store safely in your .env.',
        example: 'ag_live_7c4e09f83a21b4d6e90218a5bcdef0123456789a',
    })
    secretKey: string;
}
