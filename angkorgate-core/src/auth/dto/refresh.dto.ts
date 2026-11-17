import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
    @ApiProperty({
        description: 'The refresh token issued during login to obtain a new access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZ...',
        minLength: 10,
    })
    @IsString()
    @MinLength(10)
    refreshToken: string;
}