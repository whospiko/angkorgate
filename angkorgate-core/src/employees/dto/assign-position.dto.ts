import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignPositionDto {
    @ApiProperty({
        description: 'Employee UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    employeeId: string;

    @ApiProperty({
        description: 'Job title code identifier',
        example: 'CHIEF_PHYSICIAN',
    })
    @IsString()
    jobTitleCode: string;

    @ApiPropertyOptional({
        description: 'Department code identifier (optional if not tied to specific department)',
        example: 'CARDIOLOGY',
    })
    @IsOptional()
    @IsString()
    departmentCode?: string;

    @ApiPropertyOptional({
        description: 'Indicates whether this is the primary position for the employee',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;

    @ApiPropertyOptional({
        description: 'Effective start date in YYYY-MM-DD format',
        example: '2024-01-01',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Effective end date in YYYY-MM-DD format',
        example: '2025-12-31',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class AssignEmployeePositionDto extends OmitType(
    AssignPositionDto,
    ['employeeId'] as const,
) { }
