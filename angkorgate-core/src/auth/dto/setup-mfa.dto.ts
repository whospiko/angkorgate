import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Step 1 of setup — user must re-confirm password to start MFA enrollment */
export class SetupMfaDto {
    @ApiProperty({
        description: 'Account password to confirm user identity before setting up MFA',
        example: 'CurrentStr0ngPass!2026',
    })
    @IsString()
    @MinLength(1)
    password: string;
}
