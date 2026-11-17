import { IsNotEmpty } from 'class-validator';

export class SetAttributeDto {
    @IsNotEmpty()
    value: unknown; // string | number | boolean | array | object
}