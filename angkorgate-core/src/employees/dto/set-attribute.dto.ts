import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SetAttributeDto {
    @ApiProperty({
        description: 'Attribute value (string, number, boolean, array, or object)',
        example: 'license_no_12345',
    })
    @IsNotEmpty()
    value: unknown; // string | number | boolean | array | object
}
