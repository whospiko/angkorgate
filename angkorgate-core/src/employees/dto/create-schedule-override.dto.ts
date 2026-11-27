import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateScheduleOverrideDto {
    @ApiProperty({ description: 'Override date in YYYY-MM-DD format', example: '2026-12-25' })
    @IsDateString()
    date: string;

    @ApiProperty({
        description: 'False for day off / holiday; true for special shift hours',
        default: false,
    })
    @IsBoolean()
    isAvailable: boolean;

    @ApiPropertyOptional({ description: 'Special shift start time (HH:mm)', example: '09:00' })
    @IsOptional()
    @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
    startTime?: string;

    @ApiPropertyOptional({ description: 'Special shift end time (HH:mm)', example: '13:00' })
    @IsOptional()
    @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
    endTime?: string;

    @ApiPropertyOptional({ description: 'Reason for override (e.g. Public Holiday, Swap Shift)', maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    reason?: string;
}
