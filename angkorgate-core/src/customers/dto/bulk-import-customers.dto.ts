import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';

export class BulkImportCustomersDto {
    @ApiProperty({
        description: 'Customer rows to import (max 500 per batch)',
        type: [CreateCustomerDto],
    })
    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => CreateCustomerDto)
    rows: CreateCustomerDto[];

    @ApiPropertyOptional({
        description: 'Skip rows matching existing phone, email, or nationalId',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    skipDuplicates?: boolean;
}
