import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeCustomersDto {
    @ApiProperty({
        description: 'Primary customer UUID to keep',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    primaryCustomerId: string;

    @ApiProperty({
        description: 'Duplicate customer UUID to merge into primary and archive',
        example: '223e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    duplicateCustomerId: string;
}
