import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class LinkCustomerUserDto {
    @ApiPropertyOptional({
        description: 'User account UUID to link (or null to unlink)',
        example: '123e4567-e89b-12d3-a456-426614174000',
        nullable: true,
    })
    @IsOptional()
    @IsUUID()
    userId: string | null = null;
}
