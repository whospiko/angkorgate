import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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

    @ApiPropertyOptional({ description: 'Supporting attachment filename (PDF, PNG, or JPG)' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    attachmentName?: string;

    @ApiPropertyOptional({
        description: 'Supporting attachment MIME type',
        enum: ['application/pdf', 'image/png', 'image/jpeg'],
    })
    @IsOptional()
    @IsIn(['application/pdf', 'image/png', 'image/jpeg'])
    attachmentMimeType?: 'application/pdf' | 'image/png' | 'image/jpeg';

    @ApiPropertyOptional({ description: 'Base64 data URL for supporting PDF, PNG, or JPG attachment' })
    @IsOptional()
    @IsString()
    @MaxLength(3000000)
    @Matches(/^data:(application\/pdf|image\/(png|jpeg));base64,[A-Za-z0-9+/=]+$/, {
        message: 'Attachment must be a valid base64 PDF, PNG, or JPG data URL',
    })
    attachmentDataUrl?: string;
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
