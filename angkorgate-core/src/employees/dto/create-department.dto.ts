import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
    @ApiProperty({
        description: 'Unique department code in UPPER_SNAKE_CASE',
        example: 'CARDIOLOGY',
        pattern: '^[A-Z][A-Z0-9_]{1,49}$',
    })
    @IsString()
    @Matches(/^[A-Z][A-Z0-9_]{1,49}$/)
    code: string;

    @ApiProperty({
        description: 'Department display name',
        example: 'Cardiology Department',
        maxLength: 100,
    })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        description: 'Detailed description of department operations',
        example: 'Heart and cardiovascular care unit',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Indicates whether department is active',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
