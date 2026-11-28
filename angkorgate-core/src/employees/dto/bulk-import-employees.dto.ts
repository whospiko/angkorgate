import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

export class BulkImportEmployeesDto {
    @ApiProperty({
        description: 'Employee rows to import (max 500 per batch)',
        type: [CreateEmployeeDto],
    })
    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => CreateEmployeeDto)
    rows: CreateEmployeeDto[];

    @ApiPropertyOptional({
        description: 'Skip rows matching an existing employeeCode or phone number',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    skipDuplicates?: boolean;
}
