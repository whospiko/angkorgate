import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: 'Updated full name of the user',
        example: 'Dara Sok',
        maxLength: 150,
    })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    fullName?: string;

    @ApiPropertyOptional({
        description: 'Updated phone number in international format',
        example: '+85512345678',
    })
    @IsOptional()
    @IsString()
    @Matches(/^\+?[0-9]{8,20}$/, { message: 'phone must be a valid international phone number' })
    phone?: string;
}
