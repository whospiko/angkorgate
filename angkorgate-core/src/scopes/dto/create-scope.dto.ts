import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';

export class CreateScopeDto {
    @ApiProperty({
        description: 'Unique scope identifier (e.g. "read:patients", "invoices")',
        example: 'read:patients',
    })
    @IsString()
    @Matches(/^[a-z0-9:_-]{2,100}$/, {
        message: 'Scope name must be lowercase letters, numbers, hyphens, underscores or colons (2-100 chars)',
    })
    name: string;

    @ApiPropertyOptional({
        description: 'Human-readable display name',
        example: 'Read Patient Records',
    })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    displayName?: string;

    @ApiPropertyOptional({
        description: 'Detailed scope description',
        example: 'Allows client to view patient medical history and profiles',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'User claims injected into the token when this scope is requested',
        example: ['patient_id', 'medical_record_number'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    claims?: string[];

    @ApiPropertyOptional({
        description: 'Whether this scope is assigned to new client apps by default',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
