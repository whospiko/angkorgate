import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
    @ApiProperty({
        description: 'Type of leave',
        enum: ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'OTHER'],
        example: 'ANNUAL',
    })
    @IsIn(['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'OTHER'])
    leaveType: 'ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY' | 'OTHER';

    @ApiProperty({ description: 'Leave start date (YYYY-MM-DD)', example: '2026-12-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'Leave end date (YYYY-MM-DD)', example: '2026-12-03' })
    @IsDateString()
    endDate: string;

    @ApiPropertyOptional({ description: 'Reason or notes for leave request' })
    @IsOptional()
    @IsString()
    reason?: string;
}

export class ReviewLeaveRequestDto {
    @ApiProperty({
        description: 'Review decision',
        enum: ['APPROVED', 'REJECTED'],
        example: 'APPROVED',
    })
    @IsIn(['APPROVED', 'REJECTED'])
    decision: 'APPROVED' | 'REJECTED';

    @ApiPropertyOptional({ description: 'Optional reviewer note' })
    @IsOptional()
    @IsString()
    reviewNote?: string;
}
