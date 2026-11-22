import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetupStatusResponseDto {
    @ApiProperty({ description: 'Indicates if system initial setup has already been completed' })
    isInitialized: boolean;

    @ApiProperty({ description: 'Indicates if a Super Administrator account needs to be created' })
    requiresAdmin: boolean;

    @ApiProperty({ description: 'Configured application name', example: 'AngkorGate' })
    appName: string;

    @ApiPropertyOptional({ description: 'Configured application logo URL or base64 data URI' })
    logoUrl?: string | null;
}
