import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdatePositionDto {
    @ApiPropertyOptional({
        description: 'Department code identifier (or null to clear department)',
        example: 'CARDIOLOGY',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    departmentCode?: string | null;

    @ApiPropertyOptional({
        description: 'Indicates whether this is the primary position for the employee',
    })
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;

    @ApiPropertyOptional({
        description: 'Effective start date in YYYY-MM-DD format',
        example: '2024-01-01',
        nullable: true,
    })
    @IsOptional()
    @IsDateString()
    startDate?: string | null;

    @ApiPropertyOptional({
        description: 'Effective end date in YYYY-MM-DD format',
        example: '2025-12-31',
        nullable: true,
    })
    @IsOptional()
    @IsDateString()
    endDate?: string | null;
}
