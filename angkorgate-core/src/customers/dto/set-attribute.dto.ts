import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SetAttributeDto {
    @ApiProperty({
        description: 'Attribute value (string, number, boolean, or structured object)',
        example: 'O+',
    })
    @IsNotEmpty()
    value: unknown;
}
