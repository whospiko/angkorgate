import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertAttributeSchemaDto {
    @ApiProperty({ enum: ['CUSTOMER', 'EMPLOYEE_POSITION'], example: 'CUSTOMER' })
    @IsIn(['CUSTOMER', 'EMPLOYEE_POSITION'])
    targetType: 'CUSTOMER' | 'EMPLOYEE_POSITION';

    @ApiProperty({ example: 'PATIENT', maxLength: 30 })
    @IsString()
    @MaxLength(30)
    domain: string;

    @ApiProperty({ example: 'blood_type', maxLength: 100 })
    @IsString()
    @MaxLength(100)
    key: string;

    @ApiProperty({ enum: ['string', 'number', 'boolean', 'array<string>', 'object'], example: 'string' })
    @IsIn(['string', 'number', 'boolean', 'array<string>', 'object'])
    valueType: 'string' | 'number' | 'boolean' | 'array<string>' | 'object';

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

    @ApiPropertyOptional({ example: 'Patient ABO/Rh blood group' })
    @IsOptional()
    @IsString()
    description?: string;
}
