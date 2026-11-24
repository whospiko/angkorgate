import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsIn,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class UpdateApiKeyDto {
    @ApiPropertyOptional({ description: 'Updated name for the API key' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ description: 'Updated status', enum: ['ACTIVE', 'REVOKED'] })
    @IsOptional()
    @IsIn(['ACTIVE', 'REVOKED'])
    status?: 'ACTIVE' | 'REVOKED';

    @ApiPropertyOptional({ description: 'Allowed resources', example: ['customers'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allowedResources?: string[];

    @ApiPropertyOptional({
        description: 'Allowed HTTP methods per resource',
        example: { customers: ['GET', 'POST'] },
    })
    @IsOptional()
    @IsObject()
    allowedMethods?: Record<string, string[]>;

    @ApiPropertyOptional({
        description: 'Permissions granted to this API Key',
        example: ['customer:read', 'customer:write'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @ApiPropertyOptional({
        description: 'Field projections per resource',
        example: { customers: ['id', 'fullName', 'gender'] },
    })
    @IsOptional()
    @IsObject()
    fieldProjections?: Record<string, string[]>;

    @ApiPropertyOptional({ description: 'Rate limit (requests/min)', example: 150 })
    @IsOptional()
    @IsInt()
    @Min(1)
    rateLimit?: number;

    @ApiPropertyOptional({ description: 'New expiration date or null for never' })
    @IsOptional()
    expiresAt?: Date | null;
}
