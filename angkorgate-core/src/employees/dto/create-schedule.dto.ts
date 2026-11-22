import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsUUID,
    Matches,
    Max,
    Min,
} from 'class-validator';

export class CreateScheduleDto {
    @ApiProperty({
        description: 'Employee UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    employeeId: string;

    @ApiPropertyOptional({
        description: 'Department UUID associated with this shift schedule',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @ApiProperty({
        description: 'Day of week: 0 (Sunday) through 6 (Saturday)',
        example: 1,
        minimum: 0,
        maximum: 6,
    })
    @IsInt()
    @Min(0)
    @Max(6)
    dayOfWeek: number;

    @ApiProperty({
        description: 'Shift start time in HH:mm or HH:mm:ss format',
        example: '08:00',
    })
    @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
    startTime: string;

    @ApiProperty({
        description: 'Shift end time in HH:mm or HH:mm:ss format',
        example: '17:00',
    })
    @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
    endTime: string;

    @ApiPropertyOptional({
        description: 'Indicates whether the schedule is active',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class CreateEmployeeScheduleDto extends OmitType(
    CreateScheduleDto,
    ['employeeId'] as const,
) { }
