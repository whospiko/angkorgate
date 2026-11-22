import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConfirmEmailChangeDto {
    @ApiProperty({
        description: 'Verification token received via confirmation email',
        example: 'a1b2c3d4e5f678901234567890abcdef',
        minLength: 20,
    })
    @IsString()
    @MinLength(20)
    token: string;
}
