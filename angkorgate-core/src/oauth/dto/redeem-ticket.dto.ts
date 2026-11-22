import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RedeemTicketDto {
    @ApiProperty({
        description: 'Single-use opaque ticket received from OAuth callback redirect',
        example: '987fcdeb-51a2-43d7-9012-345678901234',
        minLength: 20,
    })
    @IsString()
    @MinLength(20)
    ticket: string;
}
