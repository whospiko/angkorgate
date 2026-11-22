import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateJobTitleDto {
    @ApiProperty({
        description: 'Unique job title code in UPPER_SNAKE_CASE',
        example: 'CHIEF_PHYSICIAN',
        pattern: '^[A-Z][A-Z0-9_]{1,49}$',
    })
    @IsString()
    @Matches(/^[A-Z][A-Z0-9_]{1,49}$/)
    code: string;

    @ApiProperty({
        description: 'Job title name',
        example: 'Chief Physician',
        maxLength: 100,
    })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        description: 'Job role and responsibilities description',
        example: 'Leads clinical evaluations and patient treatments',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Domain category of job title',
        example: 'CLINIC',
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    category?: string; // 'CLINIC' | 'HOTEL' | 'POS' | 'GENERAL'

    @ApiPropertyOptional({
        description: 'Indicates whether job title is active',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
