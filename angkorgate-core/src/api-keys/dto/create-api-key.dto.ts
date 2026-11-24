import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateApiKeyDto {
    @ApiProperty({ description: 'Human-readable name for this API key', example: 'Mobile App Integration' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ description: 'Environment prefix for key generation', enum: ['live', 'test'], default: 'live' })
    @IsOptional()
    @IsIn(['live', 'test'])
    environment?: 'live' | 'test';

    @ApiPropertyOptional({ description: 'Optional associated client application code', example: 'clinic-prod' })
    @IsOptional()
    @IsString()
    appCode?: string;

    @ApiPropertyOptional({ description: 'Expiration in days (0 for never)', example: 90, default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    expirationDays?: number;

    @ApiPropertyOptional({
        description: 'Allowed resources',
        example: ['customers', 'employees'],
        default: ['customers', 'employees'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allowedResources?: string[];

    @ApiPropertyOptional({
        description: 'Allowed HTTP methods per resource',
        example: { customers: ['GET'], employees: ['GET', 'POST'] },
    })
    @IsOptional()
    @IsObject()
    allowedMethods?: Record<string, string[]>;

    @ApiPropertyOptional({
        description: 'Permissions granted to this API Key',
        example: ['customer:read', 'employee:read'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @ApiPropertyOptional({
        description: 'Field projection allowlist per resource (empty array = all fields)',
        example: { customers: ['id', 'customerCode', 'fullName', 'gender'] },
    })
    @IsOptional()
    @IsObject()
    fieldProjections?: Record<string, string[]>;

    @ApiPropertyOptional({ description: 'Rate limit in requests per minute', example: 120, default: 120 })
    @IsOptional()
    @IsInt()
    @Min(1)
    rateLimit?: number;
}
