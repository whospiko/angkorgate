import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
    @ApiProperty({
        description: 'Email verification token received upon registration',
        example: 'v1e2r3i4f5y6t7o8k9e0n1a2b3c4d5e6',
    })
    @IsString()
    @MinLength(20)
    token: string;
}
